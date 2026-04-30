import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle,
  FileText,
  Link2,
  Plus,
  ReceiptText,
  RotateCcw,
  Save,
  Send,
  SquarePen,
  Trash2,
  Truck,
  Wallet,
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

function getPurchaseOrderStatusBadgeClass(status: PurchaseOrderStatus | string) {
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

function getBillStatusBadgeClass(status: string) {
  switch (status) {
    case "draft":
      return "border-slate-400/20 bg-slate-500/10 text-slate-300";
    case "open":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "partially_paid":
    case "overdue":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "paid":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "archived":
      return "border-white/10 bg-white/[0.05] text-slate-300";
    case "deleted":
    case "canceled":
    default:
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
  }
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
          archiveResult,
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
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Loading purchase order...
          </div>
        </div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Purchase order not found.
          </div>
        </div>
      </div>
    );
  }

  const currentCurrencyCode =
    selectedCurrency?.currency_code ||
    currencyCodeDraft ||
    purchaseOrder.currency_code ||
    "USD";

  const selectedVendorBankDetailsLines =
    buildVendorBankDetailsLines(selectedVendorBankAccount);

  const visibleArchiveItems = archiveItems.filter(
    (item) => item.status === archiveTab
  );

  const sectionCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";

  const innerPanelClass =
    "rounded-[24px] border border-white/10 bg-black/20 p-4";

  const fieldShellClass =
    "h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-60";

  const inputFieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-60";

  const readOnlyFieldClass =
    "flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm leading-6 text-white/80";

  const labelClass = "text-sm font-medium text-slate-300";

  const eyebrowClass = "text-[11px] uppercase tracking-[0.2em] text-slate-500";

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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_620px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Purchase Order Workspace
                  </Badge>

                  <Badge
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${getPurchaseOrderStatusBadgeClass(
                      purchaseOrder.status
                    )}`}
                  >
                    {normalizeStatusLabel(purchaseOrder.status)}
                  </Badge>

                  <Badge className="inline-flex w-fit rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200 shadow-none">
                    Supplier Flow
                  </Badge>

                  {isRefreshing ? (
                    <Badge className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 shadow-none">
                      Syncing
                    </Badge>
                  ) : null}
                </div>

                                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {purchaseOrder.purchase_order_number || "Purchase Order"}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Official supplier-side purchase order issued by AiXia to the
                  vendor. Draft records remain editable; issued and acknowledged
                  records preserve the purchasing commitment and move forward to
                  received vendor PI / invoice.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Vendor quotation → PO
                  </span>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    Vendor PI / Invoice received later
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Auto-refresh enabled
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Vendor / Recipient
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {selectedVendor?.legal_name ||
                          selectedVendor?.name ||
                          "—"}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
                      <Truck className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Supplier receiving this purchase order.
                  </p>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        PO Value
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {formatMoney(
                          visibleTotals.total,
                          currentCurrencyCode
                        )}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                      <Wallet className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Current purchase order amount from active line items.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {canIssue ? (
                <Button
                  onClick={() => void handleIssuePurchaseOrder()}
                  disabled={isIssuing || isSavingDraft}
                  className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isIssuing ? "Issuing..." : "Issue Purchase Order"}
                </Button>
              ) : null}

              {canAcknowledge ? (
                <Button
                  onClick={() => void handleAcknowledgePurchaseOrder()}
                  disabled={isAcknowledging}
                  className="h-11 rounded-2xl border border-emerald-400/20 bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isAcknowledging ? "Acknowledging..." : "Mark Acknowledged"}
                </Button>
              ) : null}

              {canReceiveVendorDocument ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => navigateToReceiveVendorDocument("vendor_pi")}
                    className="h-11 rounded-2xl border-violet-400/20 bg-violet-500/10 px-4 text-violet-200 hover:bg-violet-500/20"
                  >
                    <ReceiptText className="mr-2 h-4 w-4" />
                    Receive Vendor PI
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      navigateToReceiveVendorDocument("vendor_invoice")
                    }
                    className="h-11 rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20"
                  >
                    <ReceiptText className="mr-2 h-4 w-4" />
                    Receive Vendor Invoice
                  </Button>
                </>
              ) : null}

              {canArchive ? (
                <Button
                  variant="outline"
                  onClick={() => void handleArchivePurchaseOrder()}
                  disabled={isArchiving}
                  className="h-11 rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  {isArchiving ? "Archiving..." : "Archive"}
                </Button>
              ) : null}

              {purchaseOrder.status !== "archived" &&
              purchaseOrder.status !== "deleted" ? (
                <Button
                  variant="outline"
                  onClick={() => void handleDeletePurchaseOrder()}
                  disabled={isDeleting}
                  className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              ) : null}

              {errorMessage ? (
                <div className="flex min-h-11 items-center rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm text-rose-200">
                  {errorMessage}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Subtotal
                  </div>
                  <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-cyan-100">
                    {formatMoney(
                      visibleTotals.subtotal,
                      currentCurrencyCode
                    )}
                  </div>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Current supplier order line subtotal.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Discount
                  </div>
                  <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-amber-100">
                    {formatMoney(
                      visibleTotals.discount,
                      currentCurrencyCode
                    )}
                  </div>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Draft line discount total.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/20 via-violet-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Tax
                  </div>
                  <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-violet-100">
                    {formatMoney(visibleTotals.tax, currentCurrencyCode)}
                  </div>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                  <span className="h-2 w-2 rounded-full bg-violet-400" />
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Tax estimate from active tax codes.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Total
                  </div>
                  <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-emerald-100">
                    {formatMoney(visibleTotals.total, currentCurrencyCode)}
                  </div>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Full supplier purchase order value.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <div className="space-y-6">
            <Card className={sectionCardClass}>
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Document Overview
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Vendor recipient, issuing company, dates, currency, and
                      operational project context.
                    </CardDescription>
                  </div>
                </div>

                {canEditDraft ? (
                  <div className="flex items-center gap-2">
                    {editingOverview ? (
                      <>
                        <Button
                          onClick={handleSaveOverview}
                          disabled={isSavingDraft}
                          className="h-9 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingDraft ? "Saving..." : "Save"}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingOverview(false);
                            void loadPurchaseOrder(true);
                          }}
                          className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setEditingOverview(true)}
                        className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                      >
                        <SquarePen className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                ) : null}
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Vendor / Recipient</div>
                  {editingOverview && canEditDraft ? (
                    <select
                      value={vendorIdDraft}
                      onChange={(event) => {
                        setVendorIdDraft(event.target.value);
                        setVendorBankAccountIdDraft("");
                      }}
                      className={`mt-2 ${fieldShellClass}`}
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.legal_name || vendor.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {selectedVendor?.legal_name || selectedVendor?.name || "—"}
                    </div>
                  )}

                  {selectedVendor ? (
                    <div className="mt-3 space-y-1 text-sm leading-6 text-slate-300">
                      {buildVendorAddress(selectedVendor) ? (
                        <div>{buildVendorAddress(selectedVendor)}</div>
                      ) : null}
                      {selectedVendor.email ? (
                        <div>Email: {selectedVendor.email}</div>
                      ) : null}
                      {selectedVendor.phone ? (
                        <div>Phone: {selectedVendor.phone}</div>
                      ) : null}
                      {selectedVendor.code ? (
                        <div>Vendor Code: {selectedVendor.code}</div>
                      ) : null}
                      {selectedVendor.contact_person ? (
                        <div>Contact: {selectedVendor.contact_person}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Issuing Company</div>
                  {editingOverview && canEditDraft ? (
                    <select
                      value={companyIdDraft}
                      onChange={(event) => setCompanyIdDraft(event.target.value)}
                      className={`mt-2 ${fieldShellClass}`}
                    >
                      <option value="">Select company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.legal_name || company.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {selectedCompany?.legal_name ||
                        selectedCompany?.name ||
                        "—"}
                    </div>
                  )}

                  {selectedCompany ? (
                    <div className="mt-3 space-y-1 text-sm leading-6 text-slate-300">
                      {buildCompanyAddress(selectedCompany) ? (
                        <div>{buildCompanyAddress(selectedCompany)}</div>
                      ) : null}
                      {selectedCompany.email ? (
                        <div>Email: {selectedCompany.email}</div>
                      ) : null}
                      {selectedCompany.phone ? (
                        <div>Phone: {selectedCompany.phone}</div>
                      ) : null}
                      {selectedCompany.contact_person ? (
                        <div>Contact: {selectedCompany.contact_person}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>PO Status</div>
                  <div className="mt-2">
                    <Badge
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] shadow-none ${getPurchaseOrderStatusBadgeClass(
                        purchaseOrder.status
                      )}`}
                    >
                      {normalizeStatusLabel(purchaseOrder.status)}
                    </Badge>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-400">
                    Created: {formatDate(purchaseOrder.created_at)}
                    <br />
                    Updated: {formatDate(purchaseOrder.updated_at)}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>PO Date</div>
                  {editingOverview && canEditDraft ? (
                    <input
                      type="date"
                      value={poDateDraft}
                      onChange={(event) => setPoDateDraft(event.target.value)}
                      className={`mt-2 ${fieldShellClass}`}
                    />
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatDate(poDateDraft || purchaseOrder.po_date)}
                    </div>
                  )}
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Expected Delivery</div>
                  {editingOverview && canEditDraft ? (
                    <input
                      type="date"
                      value={expectedDeliveryDateDraft}
                      onChange={(event) =>
                        setExpectedDeliveryDateDraft(event.target.value)
                      }
                      className={`mt-2 ${fieldShellClass}`}
                    />
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatDate(
                        expectedDeliveryDateDraft ||
                          purchaseOrder.expected_delivery_date
                      )}
                    </div>
                  )}
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Currency</div>
                  {editingOverview && canEditDraft ? (
                    <select
                      value={currencyIdDraft}
                      onChange={(event) => {
                        const nextId = event.target.value;
                        setCurrencyIdDraft(nextId);

                        const matchedCurrency = currencies.find(
                          (currency) => currency.id === nextId
                        );

                        if (matchedCurrency) {
                          setCurrencyCodeDraft(matchedCurrency.currency_code);
                        }
                      }}
                      className={`mt-2 ${fieldShellClass}`}
                    >
                      <option value="">Select currency</option>
                      {currencies.map((currency) => (
                        <option key={currency.id} value={currency.id}>
                          {currency.currency_code} — {currency.currency_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {currentCurrencyCode}
                    </div>
                  )}
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Project</div>
                  {editingOverview && canEditDraft ? (
                    <select
                      value={projectIdDraft}
                      onChange={(event) => {
                        setProjectIdDraft(event.target.value);
                        setTaskIdDraft("");
                      }}
                      className={`mt-2 ${fieldShellClass}`}
                    >
                      <option value="">No project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {selectedProject?.name || "—"}
                    </div>
                  )}
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Task</div>
                  {editingOverview && canEditDraft ? (
                    <select
                      value={taskIdDraft}
                      onChange={(event) => setTaskIdDraft(event.target.value)}
                      className={`mt-2 ${fieldShellClass}`}
                    >
                      <option value="">No task</option>
                      {filteredTasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {selectedTask?.title || "—"}
                    </div>
                  )}
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Source</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {linkedVendorQuotation?.vendor_quotation_number ||
                      ((purchaseOrder.metadata?.source as string | undefined) ===
                      "manual_purchase_order"
                        ? "Manual"
                        : "—")}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {linkedVendorQuotation?.external_quotation_number
                      ? `External ref: ${linkedVendorQuotation.external_quotation_number}`
                      : "Vendor quotation source is optional."}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-3">
                  <div className={eyebrowClass}>Notes</div>
                  {editingOverview && canEditDraft ? (
                    <textarea
                      value={notesDraft}
                      onChange={(event) => setNotesDraft(event.target.value)}
                      rows={4}
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30"
                    />
                  ) : (
                    <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">
                      {notesDraft || purchaseOrder.notes || "—"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

                        <Card className={sectionCardClass}>
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-emerald-200">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Financial Settings
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Vendor bank account, payment terms, shipping terms, and
                      preferred payment method.
                    </CardDescription>
                  </div>
                </div>

                {canEditDraft ? (
                  <div className="flex items-center gap-2">
                    {editingFinancialSettings ? (
                      <>
                        <Button
                          onClick={handleSaveFinancialSettings}
                          disabled={isSavingDraft}
                          className="h-9 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingDraft ? "Saving..." : "Save"}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingFinancialSettings(false);
                            void loadPurchaseOrder(true);
                          }}
                          className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setEditingFinancialSettings(true)}
                        className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                      >
                        <SquarePen className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                ) : null}
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Vendor Bank Account</div>
                  {editingFinancialSettings && canEditDraft ? (
                    <select
                      value={vendorBankAccountIdDraft}
                      onChange={(event) =>
                        setVendorBankAccountIdDraft(event.target.value)
                      }
                      disabled={!vendorIdDraft}
                      className={`mt-2 ${fieldShellClass}`}
                    >
                      <option value="">Select vendor bank account</option>
                      {filteredVendorBankAccounts.map((bank) => {
                        const identifier = getVendorBankIdentifier(bank);

                        return (
                          <option key={bank.id} value={bank.id}>
                            {bank.beneficiary_name ||
                              bank.bank_name ||
                              bank.bank_id}
                            {identifier
                              ? ` — ${identifier.label}: ${identifier.value}`
                              : ""}
                            {bank.currency_code
                              ? ` — ${bank.currency_code}`
                              : ""}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {selectedVendorBankAccount?.beneficiary_name ||
                        selectedVendorBankAccount?.bank_name ||
                        "—"}
                    </div>
                  )}

                  {selectedVendorBankAccount ? (
                    <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">
                      {selectedVendorBankDetailsLines.length > 0
                        ? selectedVendorBankDetailsLines.join("\n")
                        : "—"}
                    </div>
                  ) : (
                    <div className="mt-3 text-sm leading-6 text-slate-400">
                      No vendor bank account selected.
                    </div>
                  )}
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Preferred Payment Method</div>
                  {editingFinancialSettings && canEditDraft ? (
                    <select
                      value={paymentMethodIdDraft}
                      onChange={(event) =>
                        setPaymentMethodIdDraft(event.target.value)
                      }
                      className={`mt-2 ${fieldShellClass}`}
                    >
                      <option value="">Select payment method</option>
                      {paymentMethods.map((method) => (
                        <option key={method.id} value={method.id}>
                          {method.code ? `${method.code} | ` : ""}
                          {method.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {selectedPaymentMethod?.name || "—"}
                    </div>
                  )}

                  <div className="mt-3 text-sm leading-6 text-slate-400">
                    {selectedPaymentMethod?.code
                      ? `Code: ${selectedPaymentMethod.code}`
                      : "Selected method is used later in payment-made flow."}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Payment Terms</div>
                  {editingFinancialSettings && canEditDraft ? (
                    <select
                      value={paymentTermsIdDraft}
                      onChange={(event) =>
                        setPaymentTermsIdDraft(event.target.value)
                      }
                      className={`mt-2 ${fieldShellClass}`}
                    >
                      <option value="">Select payment terms</option>
                      {paymentTerms.map((term) => (
                        <option key={term.id} value={term.id}>
                          {term.code ? `${term.code} | ` : ""}
                          {term.name}
                          {term.due_days !== null &&
                          term.due_days !== undefined
                            ? ` | Due in ${term.due_days} days`
                            : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {selectedPaymentTerm?.name || "—"}
                    </div>
                  )}

                  <div className="mt-3 text-sm leading-6 text-slate-400">
                    {selectedPaymentTerm
                      ? `${selectedPaymentTerm.code || "Terms"}${
                          selectedPaymentTerm.due_days !== null &&
                          selectedPaymentTerm.due_days !== undefined
                            ? ` · Due in ${selectedPaymentTerm.due_days} days`
                            : ""
                        }`
                      : "No payment terms selected."}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Shipping Terms</div>
                  {editingFinancialSettings && canEditDraft ? (
                    <select
                      value={shippingTermIdDraft}
                      onChange={(event) =>
                        setShippingTermIdDraft(event.target.value)
                      }
                      className={`mt-2 ${fieldShellClass}`}
                    >
                      <option value="">Select shipping terms</option>
                      {shippingTerms.map((term) => (
                        <option key={term.id} value={term.id}>
                          {term.code ? `${term.code} | ` : ""}
                          {term.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {selectedShippingTerm?.name || "—"}
                    </div>
                  )}

                  <div className="mt-3 text-sm leading-6 text-slate-400">
                    {selectedShippingTerm?.description ||
                      selectedShippingTerm?.code ||
                      "No shipping terms selected."}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Document Details
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Readable supplier document context for company, vendor,
                      source, terms, and internal notes.
                    </CardDescription>
                  </div>
                </div>

                {canEditDraft ? (
                  <div className="flex items-center gap-2">
                    {editingDocumentDetails ? (
                      <>
                        <Button
                          onClick={handleSaveDocumentDetails}
                          disabled={isSavingDraft}
                          className="h-9 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingDraft ? "Saving..." : "Save"}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingDocumentDetails(false);
                            void loadPurchaseOrder(true);
                          }}
                          className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setEditingDocumentDetails(true)}
                        className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                      >
                        <SquarePen className="mr-2 h-4 w-4" />
                        Edit Notes
                      </Button>
                    )}
                  </div>
                ) : null}
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Issuing Company</div>
                  <div className="mt-3 text-xl font-semibold leading-tight text-white">
                    {selectedCompany?.legal_name || selectedCompany?.name || "—"}
                  </div>

                  <div className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                    {selectedCompany?.contact_person ? (
                      <div>Contact: {selectedCompany.contact_person}</div>
                    ) : null}
                    {selectedCompany?.email ? (
                      <div>Email: {selectedCompany.email}</div>
                    ) : null}
                    {selectedCompany?.phone ? (
                      <div>Phone: {selectedCompany.phone}</div>
                    ) : null}
                    {buildCompanyAddress(selectedCompany) ? (
                      <div>{buildCompanyAddress(selectedCompany)}</div>
                    ) : null}
                    {!selectedCompany ? <div>—</div> : null}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Vendor / Recipient</div>
                  <div className="mt-3 text-xl font-semibold leading-tight text-white">
                    {selectedVendor?.legal_name || selectedVendor?.name || "—"}
                  </div>

                  <div className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                    {selectedVendor?.contact_person ? (
                      <div>Contact: {selectedVendor.contact_person}</div>
                    ) : null}
                    {selectedVendor?.email ? (
                      <div>Email: {selectedVendor.email}</div>
                    ) : null}
                    {selectedVendor?.phone ? (
                      <div>Phone: {selectedVendor.phone}</div>
                    ) : null}
                    {selectedVendor?.code ? (
                      <div>Vendor Code: {selectedVendor.code}</div>
                    ) : null}
                    {buildVendorAddress(selectedVendor) ? (
                      <div>{buildVendorAddress(selectedVendor)}</div>
                    ) : null}
                    {!selectedVendor ? <div>—</div> : null}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-2">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div>
                      <div className={eyebrowClass}>Payment Terms</div>
                      <div className="mt-2 text-sm font-semibold text-white">
                        {selectedPaymentTerm?.name || "—"}
                      </div>
                    </div>

                    <div>
                      <div className={eyebrowClass}>Shipping Terms</div>
                      <div className="mt-2 text-sm font-semibold text-white">
                        {selectedShippingTerm?.name || "—"}
                      </div>
                    </div>

                    <div>
                      <div className={eyebrowClass}>Currency</div>
                      <div className="mt-2 text-sm font-semibold text-white">
                        {currentCurrencyCode}
                      </div>
                    </div>

                    <div>
                      <div className={eyebrowClass}>Project / Task</div>
                      <div className="mt-2 text-sm font-semibold text-white">
                        {[selectedProject?.name, selectedTask?.title]
                          .filter(Boolean)
                          .join(" / ") || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-2">
                  <div className={eyebrowClass}>Source Relationship</div>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-[18px] border border-white/10 bg-white/[0.035] p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Source Type
                      </div>
                      <div className="mt-2 text-sm font-semibold text-white">
                        {linkedVendorQuotation
                          ? "Vendor Quotation"
                          : "Manual Purchase Order"}
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-white/10 bg-white/[0.035] p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Source Number
                      </div>
                      <div className="mt-2 text-sm font-semibold text-white">
                        {linkedVendorQuotation?.vendor_quotation_number || "—"}
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-white/10 bg-white/[0.035] p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        External Ref
                      </div>
                      <div className="mt-2 text-sm font-semibold text-white">
                        {linkedVendorQuotation?.external_quotation_number ||
                          "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-2">
                  <div className={eyebrowClass}>Internal Notes</div>
                  {editingDocumentDetails && canEditDraft ? (
                    <textarea
                      value={notesDraft}
                      onChange={(event) => setNotesDraft(event.target.value)}
                      rows={7}
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                    />
                  ) : (
                    <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">
                      {notesDraft || purchaseOrder.notes || "—"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                    <SquarePen className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Line Items
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Products, services, quantities, purchase prices, tax
                      codes, and expense categories included in this PO.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {editingLines ? (
                    <Button
                      onClick={handleSaveLines}
                      disabled={isSavingDraft}
                      className="h-9 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSavingDraft ? "Saving..." : "Save"}
                    </Button>
                  ) : null}

                  {editingLines && canEditDraft ? (
                    <Button
                      variant="outline"
                      onClick={addDraftLineItem}
                      className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Row
                    </Button>
                  ) : null}

                  {canEditDraft ? (
                    <Button
                      variant="outline"
                      onClick={() => setEditingLines((current) => !current)}
                      className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                    >
                      <SquarePen className="mr-2 h-4 w-4" />
                      {editingLines ? "Close" : "Edit"}
                    </Button>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="max-h-[720px] space-y-3 overflow-y-auto p-5 pr-4">
                {(editingLines ? lineItemsDraft : lineItems).map((row, index) => {
                  const editable = editingLines;
                  const editableRow = row as EditablePurchaseOrderLine;
                  const readOnlyRow = row as PurchaseOrderLineRow;

                  const rowQuantity = editable
                    ? toNumber(editableRow.quantity)
                    : toNumber(readOnlyRow.quantity);
                  const rowUnitPrice = editable
                    ? toNumber(editableRow.unit_price)
                    : toNumber(readOnlyRow.unit_price);
                  const rowDiscount = editable
                    ? toNumber(editableRow.discount)
                    : toNumber(readOnlyRow.discount);
                  const rowTaxCodeId = editable
                    ? editableRow.tax_code_id
                    : readOnlyRow.tax_code_id || "";
                  const rowTaxRate =
                    taxCodes.find((taxCode) => taxCode.id === rowTaxCodeId)
                      ?.rate_percent ?? 0;
                  const taxableBase = Math.max(
                    rowQuantity * rowUnitPrice - rowDiscount,
                    0
                  );
                  const rowTotal = editable
                    ? taxableBase + taxableBase * (toNumber(rowTaxRate) / 100)
                    : toNumber(readOnlyRow.line_total);

                  const selectedReadOnlyItem = editable
                    ? null
                    : items.find((item) => item.id === readOnlyRow.item_id);

                  const selectedReadOnlyUnit = editable
                    ? null
                    : units.find(
                        (unit) => unit.id === readOnlyRow.unit_of_measure_id
                      );

                  const selectedReadOnlyTax = editable
                    ? null
                    : taxCodes.find(
                        (taxCode) => taxCode.id === readOnlyRow.tax_code_id
                      );

                  const selectedReadOnlyCategory = editable
                    ? null
                    : expenseCategories.find(
                        (category) =>
                          category.id === readOnlyRow.expense_category_id
                      );

                  return (
                    <div
                      key={(row as EditablePurchaseOrderLine | PurchaseOrderLineRow).id}
                      className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-white">
                            Line {index + 1}
                          </div>

                          {editable && editableRow.vendor_quotation_line_item_id ? (
                            <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200 shadow-none">
                              Source Quote Line
                            </Badge>
                          ) : null}

                          {!editable && readOnlyRow.vendor_quotation_line_item_id ? (
                            <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200 shadow-none">
                              Source Quote Line
                            </Badge>
                          ) : null}

                          {selectedReadOnlyCategory ? (
                            <Badge className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200 shadow-none">
                              {selectedReadOnlyCategory.name}
                            </Badge>
                          ) : null}
                        </div>

                        {editable && canEditDraft ? (
                          <Button
                            variant="outline"
                            onClick={() => removeDraftLineItem(editableRow.id)}
                            disabled={lineItemsDraft.length === 1}
                            className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <label className="space-y-2 md:col-span-3">
                          <div className={labelClass}>Item</div>
                          {editable ? (
                            <select
                              value={editableRow.item_id}
                              onChange={(event) =>
                                applyItemSelection(
                                  editableRow.id,
                                  event.target.value
                                )
                              }
                              className={inputFieldClass}
                            >
                              <option value="">Manual item</option>
                              {items
                                .filter(
                                  (item) => item.is_active_for_purchase !== false
                                )
                                .map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name}
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <div className={readOnlyFieldClass}>
                              {selectedReadOnlyItem?.name || "Manual item"}
                            </div>
                          )}
                        </label>

                                                <label className="space-y-2 md:col-span-4">
                          <div className={labelClass}>Description</div>
                          {editable ? (
                            <input
                              value={editableRow.description}
                              onChange={(event) =>
                                updateDraftLine(editableRow.id, {
                                  description: event.target.value,
                                })
                              }
                              placeholder="Description"
                              className={inputFieldClass}
                            />
                          ) : (
                            <div className={readOnlyFieldClass}>
                              {readOnlyRow.description || "—"}
                            </div>
                          )}
                        </label>

                        <label className="space-y-2 md:col-span-1">
                          <div className={labelClass}>Qty</div>
                          {editable ? (
                            <input
                              value={editableRow.quantity}
                              onChange={(event) =>
                                updateDraftLine(editableRow.id, {
                                  quantity: event.target.value,
                                })
                              }
                              className={inputFieldClass}
                            />
                          ) : (
                            <div className={readOnlyFieldClass}>
                              {toNumber(readOnlyRow.quantity)}
                            </div>
                          )}
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className={labelClass}>Unit</div>
                          {editable ? (
                            <select
                              value={editableRow.unit_of_measure_id}
                              onChange={(event) =>
                                updateDraftLine(editableRow.id, {
                                  unit_of_measure_id: event.target.value,
                                })
                              }
                              className={inputFieldClass}
                            >
                              <option value="">Select unit</option>
                              {units.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                  {unit.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className={readOnlyFieldClass}>
                              {selectedReadOnlyUnit?.name || "—"}
                            </div>
                          )}
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className={labelClass}>Unit Price</div>
                          {editable ? (
                            <input
                              value={editableRow.unit_price}
                              onChange={(event) =>
                                updateDraftLine(editableRow.id, {
                                  unit_price: event.target.value,
                                })
                              }
                              className={inputFieldClass}
                            />
                          ) : (
                            <div className={readOnlyFieldClass}>
                              {formatMoney(
                                readOnlyRow.unit_price,
                                currentCurrencyCode
                              )}
                            </div>
                          )}
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className={labelClass}>Discount</div>
                          {editable ? (
                            <input
                              value={editableRow.discount}
                              onChange={(event) =>
                                updateDraftLine(editableRow.id, {
                                  discount: event.target.value,
                                })
                              }
                              className={inputFieldClass}
                            />
                          ) : (
                            <div className={readOnlyFieldClass}>
                              {formatMoney(
                                readOnlyRow.discount,
                                currentCurrencyCode
                              )}
                            </div>
                          )}
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className={labelClass}>Tax Code</div>
                          {editable ? (
                            <select
                              value={editableRow.tax_code_id}
                              onChange={(event) =>
                                updateDraftLine(editableRow.id, {
                                  tax_code_id: event.target.value,
                                })
                              }
                              className={inputFieldClass}
                            >
                              <option value="">Select tax</option>
                              {taxCodes.map((tax) => (
                                <option key={tax.id} value={tax.id}>
                                  {tax.code ? `${tax.code} | ` : ""}
                                  {tax.name} — {toNumber(tax.rate_percent)}%
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className={readOnlyFieldClass}>
                              {selectedReadOnlyTax
                                ? `${selectedReadOnlyTax.code || ""}${
                                    selectedReadOnlyTax.code ? " | " : ""
                                  }${selectedReadOnlyTax.name}`
                                : "—"}
                            </div>
                          )}
                        </label>

                        <label className="space-y-2 md:col-span-3">
                          <div className={labelClass}>Expense Category</div>
                          {editable ? (
                            <select
                              value={editableRow.expense_category_id}
                              onChange={(event) =>
                                updateDraftLine(editableRow.id, {
                                  expense_category_id: event.target.value,
                                })
                              }
                              className={inputFieldClass}
                            >
                              <option value="">Select category</option>
                              {expenseCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.code ? `${category.code} | ` : ""}
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className={readOnlyFieldClass}>
                              {selectedReadOnlyCategory?.name || "—"}
                            </div>
                          )}
                        </label>

                        <div className="space-y-2 md:col-span-3">
                          <div className={labelClass}>Line Total</div>
                          <div className="flex min-h-[44px] items-center rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100">
                            {formatMoney(rowTotal, currentCurrencyCode)}
                          </div>
                        </div>

                        <label className="space-y-2 md:col-span-12">
                          <div className={labelClass}>Line Notes</div>
                          {editable ? (
                            <input
                              value={editableRow.notes}
                              onChange={(event) =>
                                updateDraftLine(editableRow.id, {
                                  notes: event.target.value,
                                })
                              }
                              placeholder="Optional line notes"
                              className={inputFieldClass}
                            />
                          ) : (
                            <div className={readOnlyFieldClass}>
                              {readOnlyRow.notes || "—"}
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  );
                })}

                {(editingLines ? lineItemsDraft : lineItems).length === 0 ? (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm text-slate-400">
                    No active purchase order line items.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Purchase Order Summary
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Live supplier-side summary for commitment, received vendor
                  documents, and payable balance.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Purchase Order</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {purchaseOrder.purchase_order_number}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge
                      className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] shadow-none ${getPurchaseOrderStatusBadgeClass(
                        purchaseOrder.status
                      )}`}
                    >
                      {normalizeStatusLabel(purchaseOrder.status)}
                    </Badge>
                    <Badge className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300 shadow-none">
                      {currentCurrencyCode}
                    </Badge>
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Vendor</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedVendor?.legal_name || selectedVendor?.name || "—"}
                  </div>

                  {selectedVendor ? (
                    <div className="mt-2 text-sm leading-6 text-slate-400">
                      {buildVendorAddress(selectedVendor) ? (
                        <div>{buildVendorAddress(selectedVendor)}</div>
                      ) : null}
                      {selectedVendor.email ? (
                        <div>Email: {selectedVendor.email}</div>
                      ) : null}
                      {selectedVendor.phone ? (
                        <div>Phone: {selectedVendor.phone}</div>
                      ) : null}
                      {selectedVendor.code ? (
                        <div>Vendor Code: {selectedVendor.code}</div>
                      ) : null}
                      {selectedVendor.contact_person ? (
                        <div>Contact: {selectedVendor.contact_person}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Vendor Bank Account</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedVendorBankAccount?.beneficiary_name ||
                      selectedVendorBankAccount?.bank_name ||
                      "—"}
                  </div>

                  {selectedVendorBankAccount ? (
                    <div className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-400">
                      {selectedVendorBankDetailsLines.length > 0
                        ? selectedVendorBankDetailsLines.join("\n")
                        : "—"}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm leading-6 text-slate-400">
                      No vendor bank account selected.
                    </div>
                  )}
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Timeline</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatDate(purchaseOrder.po_date)}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    Expected delivery:{" "}
                    {formatDate(purchaseOrder.expected_delivery_date)}
                    <br />
                    Issued: {formatDate(purchaseOrder.issued_at)}
                    <br />
                    Acknowledged: {formatDate(purchaseOrder.acknowledged_at)}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>PO Financials</div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Subtotal</span>
                      <span className="font-semibold text-white">
                        {formatMoney(
                          visibleTotals.subtotal,
                          currentCurrencyCode
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Discount</span>
                      <span className="font-semibold text-white">
                        {formatMoney(
                          visibleTotals.discount,
                          currentCurrencyCode
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Tax</span>
                      <span className="font-semibold text-white">
                        {formatMoney(visibleTotals.tax, currentCurrencyCode)}
                      </span>
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-300">
                          Total
                        </span>
                        <span className="text-lg font-semibold text-white">
                          {formatMoney(
                            visibleTotals.total,
                            currentCurrencyCode
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Received Vendor Documents</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {linkedBills.length}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    Total received:{" "}
                    {formatMoney(linkedBillTotal, currentCurrencyCode)}
                    <br />
                    Paid: {formatMoney(linkedPaidTotal, currentCurrencyCode)}
                    <br />
                    Balance:{" "}
                    {formatMoney(linkedBalanceTotal, currentCurrencyCode)}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Terms</div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    Payment:{" "}
                    <span className="font-semibold text-white">
                      {selectedPaymentTerm?.name || "—"}
                    </span>
                    <br />
                    Shipping:{" "}
                    <span className="font-semibold text-white">
                      {selectedShippingTerm?.name || "—"}
                    </span>
                    <br />
                    Method:{" "}
                    <span className="font-semibold text-white">
                      {selectedPaymentMethod?.name || "—"}
                    </span>
                  </div>
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
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Linked Documents
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Source vendor quotation, received vendor PI / invoice,
                      and payments made against this supplier flow.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className={innerPanelClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={eyebrowClass}>Source Vendor Quotation</div>
                      <div className="mt-2 text-xl font-semibold text-white">
                        {linkedVendorQuotation?.vendor_quotation_number || "—"}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">
                        {linkedVendorQuotation ? (
                          <>
                            Status:{" "}
                            {normalizeStatusLabel(linkedVendorQuotation.status)}
                            <br />
                            External ref:{" "}
                            {linkedVendorQuotation.external_quotation_number ||
                              "—"}
                            <br />
                            Total:{" "}
                            {formatMoney(
                              linkedVendorQuotation.total_amount,
                              linkedVendorQuotation.currency_code ||
                                currentCurrencyCode
                            )}
                          </>
                        ) : (
                          "This purchase order was created manually or has no linked quotation."
                        )}
                      </div>
                    </div>

                    {linkedVendorQuotation ? (
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/finance/transactions/vendor-quotations/${linkedVendorQuotation.id}`
                          )
                        }
                        className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                      >
                        Open
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={eyebrowClass}>Vendor PI / Invoice</div>
                        <div className="mt-2 text-xl font-semibold text-white">
                          {linkedBills.length} received
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">
                          Vendor PI / Invoice documents are received from the
                          supplier and registered against this PO.
                        </div>
                      </div>

                      {canReceiveVendorDocument ? (
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            onClick={() =>
                              navigateToReceiveVendorDocument("vendor_pi")
                            }
                            className="h-9 rounded-2xl border-violet-400/20 bg-violet-500/10 px-3 text-violet-200 hover:bg-violet-500/20"
                          >
                            Receive PI
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              navigateToReceiveVendorDocument("vendor_invoice")
                            }
                            className="h-9 rounded-2xl border-amber-400/20 bg-amber-500/10 px-3 text-amber-200 hover:bg-amber-500/20"
                          >
                            Receive Invoice
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {linkedBills.length > 0 ? (
                      <div className="max-h-[430px] overflow-y-auto rounded-[18px] border border-white/10 bg-black/20">
                        <table className="w-full min-w-[620px] border-collapse">
                          <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/80 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500 backdrop-blur-xl">
                            <tr>
                              <th className="px-4 py-3 font-semibold">
                                Document
                              </th>
                              <th className="px-4 py-3 font-semibold">Type</th>
                              <th className="px-4 py-3 font-semibold">
                                Status
                              </th>
                              <th className="px-4 py-3 font-semibold">
                                Balance
                              </th>
                              <th className="px-4 py-3 text-right font-semibold">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {linkedBills.map((bill) => (
                              <tr
                                key={bill.id}
                                className="border-b border-white/5 text-sm text-slate-300 transition last:border-b-0 hover:bg-white/[0.035]"
                              >
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-white">
                                    {bill.bill_number}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    External:{" "}
                                    {bill.external_document_number || "—"}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {getDocumentTypeLabel(bill.document_type)}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge
                                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] shadow-none ${getBillStatusBadgeClass(
                                      bill.status
                                    )}`}
                                  >
                                    {normalizeStatusLabel(bill.status)}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  {formatMoney(
                                    bill.balance_due,
                                    bill.currency_code || currentCurrencyCode
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      navigate(
                                        `/finance/transactions/bills/${bill.id}`
                                      )
                                    }
                                    className="h-8 rounded-xl border-white/10 bg-white/[0.05] px-3 text-xs text-white hover:bg-white/[0.08]"
                                  >
                                    Open
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                </div>

                                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Payments Made</div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {linkedPayments.length} payment records
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    Payments made are linked after received vendor documents are
                    approved and payable.
                  </div>

                  {linkedPayments.length > 0 ? (
                    <div className="mt-4 max-h-[320px] overflow-y-auto rounded-[18px] border border-white/10 bg-black/20">
                      <table className="w-full min-w-[520px] border-collapse">
                        <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/80 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500 backdrop-blur-xl">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Date</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">Amount</th>
                            <th className="px-4 py-3 text-right font-semibold">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {linkedPayments.map((payment) => (
                            <tr
                              key={payment.id}
                              className="border-b border-white/5 text-sm text-slate-300 transition last:border-b-0 hover:bg-white/[0.035]"
                            >
                              <td className="px-4 py-3">
                                {formatDate(payment.payment_date)}
                              </td>
                              <td className="px-4 py-3">
                                {normalizeStatusLabel(payment.status)}
                              </td>
                              <td className="px-4 py-3">
                                {formatMoney(
                                  payment.converted_amount || payment.amount,
                                  payment.bill_currency_code ||
                                    payment.payment_currency_code ||
                                    currentCurrencyCode
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    navigate(
                                      `/finance/transactions/payments-made/${payment.id}`
                                    )
                                  }
                                  className="h-8 rounded-xl border-white/10 bg-white/[0.05] px-3 text-xs text-white hover:bg-white/[0.08]"
                                >
                                  Open
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-3 text-amber-200">
                    <Archive className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Archive
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Browse archived and deleted purchase orders.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Archive Center</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {archiveItems.length} records
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    Archived records can be restored. Deleted records can be
                    restored or permanently deleted.
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      void loadArchiveItems();
                      setShowArchivePopup(true);
                    }}
                    className="mt-4 h-10 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                  >
                    Open Archive
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {showArchivePopup ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md">
            <div className="flex max-h-[88vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#070a12] shadow-2xl shadow-black/40">
              <div className="relative overflow-hidden border-b border-white/10 p-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.12),transparent_38%),radial-gradient(circle_at_top_right,rgba(244,63,94,0.12),transparent_34%)]" />

                <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Badge className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200 shadow-none">
                      Purchase Orders Archive
                    </Badge>

                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white">
                      Archived & Deleted Purchase Orders
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                      Use this archive center to restore soft-archived purchase
                      orders or permanently delete records that were already
                      moved to deleted status.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setShowArchivePopup(false)}
                    className="h-10 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                  >
                    Close
                  </Button>
                </div>
              </div>

              <div className="border-b border-white/10 p-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setArchiveTab("archived")}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                      archiveTab === "archived"
                        ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                        : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    Archived
                  </button>

                  <button
                    type="button"
                    onClick={() => setArchiveTab("deleted")}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                      archiveTab === "deleted"
                        ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
                        : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    Deleted
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-5">
                <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/[0.035]">
                  <table className="w-full min-w-[980px] border-collapse">
                    <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/80 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500 backdrop-blur-xl">
                      <tr>
                        <th className="px-5 py-4 font-semibold">PO Number</th>
                        <th className="px-5 py-4 font-semibold">Status</th>
                        <th className="px-5 py-4 font-semibold">PO Date</th>
                        <th className="px-5 py-4 font-semibold">Currency</th>
                        <th className="px-5 py-4 font-semibold">Total</th>
                        <th className="px-5 py-4 font-semibold">Updated</th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleArchiveItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-white/5 text-sm text-slate-300 transition last:border-b-0 hover:bg-white/[0.035]"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-white">
                              {item.purchase_order_number}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <Badge
                              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] shadow-none ${getPurchaseOrderStatusBadgeClass(
                                item.status
                              )}`}
                            >
                              {normalizeStatusLabel(item.status)}
                            </Badge>
                          </td>

                          <td className="px-5 py-4">
                            {formatDate(item.po_date)}
                          </td>

                          <td className="px-5 py-4">
                            {item.currency_code || "—"}
                          </td>

                          <td className="px-5 py-4">
                            {formatMoney(
                              item.total_amount,
                              item.currency_code || "USD"
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {formatDate(item.updated_at)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() =>
                                  navigate(
                                    `/finance/transactions/purchase-orders/${item.id}`
                                  )
                                }
                                className="h-8 rounded-xl border-white/10 bg-white/[0.05] px-3 text-xs text-white hover:bg-white/[0.08]"
                              >
                                Open
                              </Button>

                              <Button
                                variant="outline"
                                onClick={() =>
                                  void handleRestorePurchaseOrder(item.id)
                                }
                                disabled={isDeleting}
                                className="h-8 rounded-xl border-emerald-400/20 bg-emerald-500/10 px-3 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                Restore
                              </Button>

                              {archiveTab === "deleted" ? (
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    void handleHardDeletePurchaseOrder(item.id)
                                  }
                                  disabled={isDeleting}
                                  className="h-8 rounded-xl border-rose-400/20 bg-rose-500/10 px-3 text-xs text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Hard Delete
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}

                      {visibleArchiveItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-5 py-10 text-center text-sm text-slate-500"
                          >
                            No {archiveTab} purchase orders.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
