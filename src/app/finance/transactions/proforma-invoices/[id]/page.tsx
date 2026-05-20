"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  CheckCircle,
  CreditCard,
  FileText,
  Link2,
  Printer,
  RotateCcw,
  Save,
  SquarePen,
  Trash2,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  AixiaAccessRule,
  AixiaActionCard,
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

import ProformaInvoicePrintDocument from "./ProformaInvoicePrintDocument";

import {
  archiveProformaInvoice,
  convertProformaToInvoice,
  getProformaInvoiceById,
  getProformaInvoiceLineItems,
  getProformaInvoicesArchiveList,
  permanentlyDeleteProformaInvoice,
  restoreProformaInvoice,
  softDeleteProformaInvoice,
} from "@/lib/finance/proformaInvoices";

type ProformaStatus =
  | "draft"
  | "issued"
  | "confirmed"
  | "converted"
  | "archived"
  | "canceled"
  | "deleted";

type ProformaRecord = {
  id: string;
  proforma_number: string | null;
  client_id: string | null;
  client_po_id?: string | null;
  quotation_id?: string | null;
  company_id?: string | null;
  issue_date: string;
  valid_until: string | null;
  status: ProformaStatus;
  subtotal: number | string | null;
  tax_amount: number | string | null;
  discount_amount: number | string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  payment_status: string | null;
  currency_id: string | null;
  exchange_rate: number | string | null;
  project_id: string | null;
  task_id: string | null;
  payment_terms_id?: string | null;
  shipping_term_id?: string | null;
  bank_account_id?: string | null;
  payment_terms_snapshot?: string | null;
  payment_terms_document_text?: string | null;
  shipping_terms_snapshot?: string | null;
  terms_and_conditions_snapshot?: string | null;
  bank_details_snapshot?: string | null;
  currency_code?: string | null;
  notes: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type ProformaLineItemRow = {
  id: string;
  proforma_invoice_id: string;
  item_id: string | null;
  item_name?: string | null;
  description: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  discount: number | string | null;
  tax_code_id: string | null;
  tax_rate?: number | string | null;
  unit_of_measure_id: string | null;
  revenue_category_id: string | null;
  line_total: number | string | null;
  sort_order: number | null;
  project_id: string | null;
  task_id: string | null;
};

type InvoiceLinkRow = {
  id: string;
  invoice_number: string | null;
  status: string;
  payment_status: string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  issue_date: string | null;
  due_date: string | null;
  currency_code: string | null;
};

type PaymentRow = {
  id: string;
  amount: number;
  converted_amount: number;
  payment_currency_code: string;
  invoice_currency_code: string;
  payment_date: string;
  status: string;
  reference_number: string | null;
};

type CustomerPoSource = {
  id: string;
  client_po_number: string | null;
  external_po_number: string | null;
  quotation_id: string | null;
  proforma_invoice_id: string | null;
  client_id: string | null;
  company_id: string | null;
  po_date: string | null;
  received_at: string | null;
  status: string;
  currency_id: string | null;
  currency_code: string | null;
  total_amount: number | string | null;
  notes: string | null;
  project_id: string | null;
  task_id: string | null;
};

type CustomerPoLineSource = {
  id: string;
  client_po_id: string;
  item_id: string | null;
  description: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  discount: number | string | null;
  sort_order: number | null;
  unit_of_measure_id: string | null;
  tax_code_id: string | null;
  revenue_category_id: string | null;
  project_id: string | null;
  task_id: string | null;
  status: string | null;
};

type ProjectRow = {
  id: string;
  name: string;
};

type TaskRow = {
  id: string;
  title: string;
  project_id: string | null;
};

type ArchiveProformaRow = {
  id: string;
  proforma_number: string | null;
  status: string;
  total_amount: number | string | null;
  updated_at: string | null;
};

type EditableLineItem = {
  id: string;
  item_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount: string;
  tax_code_id: string;
  unit_of_measure_id: string;
  revenue_category_id: string;
};

type ClientOption = {
  id: string;
  name: string;
  legal_name: string | null;
  contact_person: string | null;
  company_email: string | null;
  personnel_email: string | null;
  company_phone: string | null;
  personnel_phone: string | null;
  currency_code: string | null;
  payment_terms_days: number | null;
  payment_terms_id: string | null;
  country: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
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
  is_default: boolean;
  document_label: string | null;
  document_terms_text: string | null;
};

type ShippingTermOption = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_default: boolean;
};

type BankAccountOption = {
  id: string;
  name: string;
  bank_name: string | null;
  institution_name: string | null;
  beneficiary_name: string | null;
  iban: string | null;
  swift_code: string | null;
  bank_address: string | null;
  account_number: string | null;
  masked_account_number: string | null;
  account_identifier_type: string | null;
  account_identifier_value: string | null;
  country: string | null;
  city: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  currency_code: string | null;
  is_default: boolean;
  company_id: string | null;
};

type PaymentMethodOption = {
  id: string;
  code: string | null;
  name: string;
};

type ItemOption = {
  id: string;
  name: string;
  description: string | null;
  sales_price: number | null;
  currency_code: string | null;
  revenue_category_id: string | null;
  tax_code_id: string | null;
  unit_of_measure_id: string | null;
};

type TaxCodeOption = {
  id: string;
  code: string;
  name: string;
  rate_percent: number;
};

type UnitOfMeasureOption = {
  id: string;
  code: string;
  name: string;
};

type RevenueCategoryOption = {
  id: string;
  code: string | null;
  name: string;
};

function createEditableDraftLineItem(): EditableLineItem {
  return {
    id: `new_${crypto.randomUUID()}`,
    item_id: "",
    description: "",
    quantity: "1",
    unit_price: "0",
    discount: "0",
    tax_code_id: "",
    unit_of_measure_id: "",
    revenue_category_id: "",
  };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatFinanceMoney(
  value: number | string | null | undefined,
  currencyCode = "USD"
) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatFinanceDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getDateInputValue(value: string | null | undefined) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().slice(0, 10);
}

function joinAddress(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(", ");
}

function buildCompanyAddress(company: CompanyOption | null) {
  if (!company) return "";

  return joinAddress([
    company.address_line_1,
    company.address_line_2,
    company.city,
    company.state_province,
    company.postal_code,
    company.country,
  ]);
}

function buildClientAddress(client: ClientOption | null) {
  if (!client) return "";

  return joinAddress([
    client.address_line_1,
    client.address_line_2,
    client.city,
    client.state_province,
    client.postal_code,
    client.country,
  ]);
}

function buildBankIdentifierLine(account: BankAccountOption | null) {
  if (!account) return "";

  if (account.iban) {
    return `IBAN: ${account.iban}`;
  }

  if (account.swift_code) {
    return `SWIFT: ${account.swift_code}`;
  }

  if (account.account_identifier_value) {
    const normalizedType = (account.account_identifier_type || "").toLowerCase();

    return `${
      normalizedType === "swift" ? "SWIFT" : "Identifier"
    }: ${account.account_identifier_value}`;
  }

  return "";
}

function buildBankAddressFromAccount(account: BankAccountOption | null) {
  if (!account) return "";

  if (account.bank_address) {
    return account.bank_address;
  }

  return joinAddress([
    account.address_line_1,
    account.address_line_2,
    account.city,
    account.postal_code,
    account.country,
  ]);
}

function buildBankDetailsLinesFromAccount(account: BankAccountOption | null) {
  if (!account) return [];

  const resolvedBankName = account.bank_name || account.institution_name || "";
  const resolvedAccountNumber =
    account.account_number || account.masked_account_number || "";
  const resolvedIdentifierLine = buildBankIdentifierLine(account);
  const resolvedBankAddress = buildBankAddressFromAccount(account);

  return [
    account.beneficiary_name || "",
    resolvedBankName,
    resolvedBankAddress,
    resolvedAccountNumber ? `Account: ${resolvedAccountNumber}` : "",
    resolvedIdentifierLine,
    account.currency_code ? `Currency: ${account.currency_code}` : "",
  ].filter((line) => line && line.trim());
}

function buildBankDetailsSnapshotFromAccount(account: BankAccountOption | null) {
  const lines = buildBankDetailsLinesFromAccount(account);
  return lines.length > 0 ? lines.join("\n") : null;
}

function buildBankDetailsLinesFromSnapshot(snapshot: string | null | undefined) {
  if (!snapshot) return [];

  return snapshot
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (line === "IBAN: —") return false;
      if (line === "SWIFT: —") return false;
      if (line === "Account: —") return false;
      if (line === "Currency: —") return false;
      return true;
    });
}

function getProformaStatusLabel(status: ProformaStatus) {
  switch (status) {
    case "draft":
      return "Draft";
    case "issued":
      return "Issued";
    case "confirmed":
      return "Confirmed";
    case "converted":
      return "Converted";
    case "archived":
      return "Archived";
    case "deleted":
      return "Deleted";
    case "canceled":
      return "Canceled";
    default:
      return status;
  }
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

function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function getMetadataNumberOrString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" || typeof value === "number" ? value : null;
}

function resolveProformaClientPoId(proforma: ProformaRecord | null) {
  if (!proforma) return "";

  return (
    proforma.client_po_id ||
    getMetadataString(proforma.metadata, "client_po_id") ||
    ""
  );
}

function resolveProformaQuotationId(proforma: ProformaRecord | null) {
  if (!proforma) return "";

  return (
    proforma.quotation_id ||
    getMetadataString(proforma.metadata, "quotation_id") ||
    ""
  );
}

function getLineItemDisplayName(
  row: ProformaLineItemRow | EditableLineItem,
  items: ItemOption[],
) {
  const selectedItem = items.find((item) => item.id === row.item_id);

  if (selectedItem?.name) return selectedItem.name;

  if ("item_name" in row && row.item_name) return row.item_name;

  return row.description || "—";
}

function getLineTaxDisplayName(
  row: ProformaLineItemRow | EditableLineItem,
  taxCodes: TaxCodeOption[],
) {
  const selectedTaxCode = taxCodes.find((taxCode) => taxCode.id === row.tax_code_id);

  if (selectedTaxCode) {
    return `${selectedTaxCode.name} — ${toNumber(selectedTaxCode.rate_percent).toFixed(2)}%`;
  }

  if ("tax_rate" in row && row.tax_rate !== null && row.tax_rate !== undefined) {
    return `${toNumber(row.tax_rate).toFixed(2)}%`;
  }

  return "—";
}

function getLineUnitDisplayName(
  row: ProformaLineItemRow | EditableLineItem,
  unitsOfMeasure: UnitOfMeasureOption[],
) {
  const selectedUnit = unitsOfMeasure.find((unit) => unit.id === row.unit_of_measure_id);

  if (!selectedUnit) return "—";

  return selectedUnit.code ? `${selectedUnit.name} — ${selectedUnit.code}` : selectedUnit.name;
}

function getLineRevenueCategoryDisplayName(
  row: ProformaLineItemRow | EditableLineItem,
  revenueCategories: RevenueCategoryOption[],
) {
  const selectedCategory = revenueCategories.find(
    (category) => category.id === row.revenue_category_id,
  );

  if (!selectedCategory) return "—";

  return selectedCategory.code
    ? `${selectedCategory.name} — ${selectedCategory.code}`
    : selectedCategory.name;
}

export default function FinanceProformaInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const [proforma, setProforma] = useState<ProformaRecord | null>(null);
  const [lineItems, setLineItems] = useState<ProformaLineItemRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [linkedInvoice, setLinkedInvoice] = useState<InvoiceLinkRow | null>(
    null
  );
  const [linkedCustomerPo, setLinkedCustomerPo] =
    useState<CustomerPoSource | null>(null);
  const [archiveItems, setArchiveItems] = useState<ArchiveProformaRow[]>([]);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermOption[]>([]);
  const [shippingTerms, setShippingTerms] = useState<ShippingTermOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>(
    []
  );
  const [items, setItems] = useState<ItemOption[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([]);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasureOption[]>(
    []
  );
  const [revenueCategories, setRevenueCategories] = useState<
    RevenueCategoryOption[]
  >([]);
  const [customerPoSources, setCustomerPoSources] = useState<CustomerPoSource[]>(
    []
  );

  const [showArchivePopup, setShowArchivePopup] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">(
    "archived"
  );

  const [editingOverview, setEditingOverview] = useState(false);
  const [editingFinancialSettings, setEditingFinancialSettings] =
    useState(false);
  const [editingDocumentDetails, setEditingDocumentDetails] = useState(false);
  const [editingLines, setEditingLines] = useState(false);

  const [sourceModeDraft, setSourceModeDraft] = useState<
    "manual" | "customer_po"
  >("manual");
  const [sourceCustomerPoIdDraft, setSourceCustomerPoIdDraft] = useState("");
  const [clientIdDraft, setClientIdDraft] = useState("");
  const [companyIdDraft, setCompanyIdDraft] = useState("");
  const [projectIdDraft, setProjectIdDraft] = useState("");
  const [taskIdDraft, setTaskIdDraft] = useState("");
  const [issueDateDraft, setIssueDateDraft] = useState("");
  const [validUntilDraft, setValidUntilDraft] = useState("");
  const [currencyIdDraft, setCurrencyIdDraft] = useState("");
  const [paymentTermsIdDraft, setPaymentTermsIdDraft] = useState("");
  const [shippingTermIdDraft, setShippingTermIdDraft] = useState("");
  const [bankAccountIdDraft, setBankAccountIdDraft] = useState("");
  const [paymentMethodIdDraft, setPaymentMethodIdDraft] = useState("");
  const [termsAndConditionsDraft, setTermsAndConditionsDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [lineItemsDraft, setLineItemsDraft] = useState<EditableLineItem[]>([]);
  const [error, setError] = useState("");

  const handlePrint = useCallback(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  }, []);

  const loadArchiveItems = useCallback(async () => {
    const rows = (await getProformaInvoicesArchiveList()) as ArchiveProformaRow[];
    setArchiveItems(rows);
  }, []);

  const loadProforma = useCallback(
    async (refreshOnly = false) => {
      if (!id) return;

      if (!refreshOnly) {
        setIsLoading(true);
      }

      setError("");

      try {
        const [proformaRecord, proformaLines, invoiceResult, paymentsResult] =
          await Promise.all([
            getProformaInvoiceById(id),
            getProformaInvoiceLineItems(id),
            supabase
              .from("finance_invoices_issued")
              .select(
                "id, invoice_number, status, payment_status, total_amount, paid_amount, balance_due, issue_date, due_date, currency_code"
              )
              .eq("proforma_invoice_id", id)
              .limit(1),
            supabase
              .from("finance_payments_received")
              .select(
                "id, amount, converted_amount, payment_currency_code, invoice_currency_code, payment_date, status, reference_number"
              )
              .eq("proforma_invoice_id", id)
              .eq("status", "confirmed")
              .order("payment_date", { ascending: false }),
          ]);

        if (invoiceResult.error) {
          throw invoiceResult.error;
        }
        if (paymentsResult.error) {
          throw paymentsResult.error;
        }

        let typedProforma = proformaRecord as unknown as ProformaRecord;

        if (typedProforma?.payment_terms_id) {
          const { data: paymentTermData, error: paymentTermError } =
            await supabase
              .from("finance_payment_terms")
              .select("name, document_label, document_terms_text")
              .eq("id", typedProforma.payment_terms_id)
              .maybeSingle();

          if (paymentTermError) {
            console.warn(
              "Failed to load proforma payment term wording:",
              paymentTermError
            );
          }

          if (paymentTermData) {
            typedProforma = {
              ...typedProforma,
              payment_terms_snapshot:
                typedProforma.payment_terms_snapshot ||
                paymentTermData.document_label ||
                paymentTermData.name ||
                null,
              payment_terms_document_text:
                paymentTermData.document_terms_text || null,
            };
          }
        }

        const typedLineItems =
          (proformaLines || []) as unknown as ProformaLineItemRow[];
        const linkedInvoiceRow =
          ((invoiceResult.data || [])[0] as InvoiceLinkRow | undefined) || null;

        const metadata = typedProforma.metadata || {};
        const resolvedClientPoId = resolveProformaClientPoId(typedProforma);
        let customerPoRow: CustomerPoSource | null = null;

        if (resolvedClientPoId) {
          const { data: customerPoData, error: customerPoError } = await supabase
            .from("finance_client_purchase_orders")
            .select(
              "id, client_po_number, external_po_number, quotation_id, proforma_invoice_id, client_id, company_id, po_date, received_at, status, currency_id, currency_code, total_amount, notes, project_id, task_id"
            )
            .eq("id", resolvedClientPoId)
            .maybeSingle();

          if (customerPoError) {
            console.warn("Failed to load linked Customer PO:", customerPoError);
          }

          customerPoRow = (customerPoData || null) as CustomerPoSource | null;
        }

        setProforma(typedProforma);
        setLineItems(typedLineItems);
        setPayments((paymentsResult.data || []) as PaymentRow[]);
        setLinkedInvoice(linkedInvoiceRow);
        setLinkedCustomerPo(customerPoRow);

        const resolvedCompanyId =
          typedProforma.company_id ||
          getMetadataString(metadata, "issuing_company_id") ||
          "";
        const resolvedShippingTermId =
          typedProforma.shipping_term_id ||
          getMetadataString(metadata, "shipping_term_id") ||
          "";
        const resolvedBankAccountId =
          typedProforma.bank_account_id ||
          getMetadataString(metadata, "bank_account_id") ||
          "";
        const resolvedPaymentMethodId = getMetadataString(
          metadata,
          "preferred_payment_method_id"
        );

        setSourceModeDraft(resolvedClientPoId ? "customer_po" : "manual");
        setSourceCustomerPoIdDraft(resolvedClientPoId);
        setClientIdDraft(typedProforma.client_id || "");
        setCompanyIdDraft(resolvedCompanyId);
        setProjectIdDraft(typedProforma.project_id || "");
        setTaskIdDraft(typedProforma.task_id || "");
        setIssueDateDraft(getDateInputValue(typedProforma.issue_date));
        setValidUntilDraft(getDateInputValue(typedProforma.valid_until));
        setCurrencyIdDraft(typedProforma.currency_id || "");
        setPaymentTermsIdDraft(typedProforma.payment_terms_id || "");
        setShippingTermIdDraft(resolvedShippingTermId);
        setBankAccountIdDraft(resolvedBankAccountId);
        setPaymentMethodIdDraft(resolvedPaymentMethodId);
        setTermsAndConditionsDraft(
          typedProforma.terms_and_conditions_snapshot ||
            getMetadataString(metadata, "terms_and_conditions_snapshot") ||
            ""
        );
        setNotesDraft(typedProforma.notes || "");

        setLineItemsDraft(
          typedLineItems.length > 0
            ? typedLineItems.map((row) => ({
                id: row.id,
                item_id: row.item_id || "",
                description: row.description || "",
                quantity: String(row.quantity ?? 0),
                unit_price: String(row.unit_price ?? 0),
                discount: String(row.discount ?? 0),
                tax_code_id: row.tax_code_id || "",
                unit_of_measure_id: row.unit_of_measure_id || "",
                revenue_category_id: row.revenue_category_id || "",
              }))
            : [createEditableDraftLineItem()]
        );
      } catch (err) {
        console.error(err);
        setError("Failed to load proforma invoice.");
      } finally {
        if (!refreshOnly) {
          setIsLoading(false);
        }
      }
    },
    [id]
  );

  const loadMasterData = useCallback(async () => {
    try {
      const [
        clientsResult,
        companiesResult,
        projectsResult,
        tasksResult,
        currenciesResult,
        paymentTermsResult,
        shippingTermsResult,
        bankAccountsResult,
        paymentMethodsResult,
        itemsResult,
        taxCodesResult,
        unitsOfMeasureResult,
        revenueCategoriesResult,
        customerPoSourcesResult,
      ] = await Promise.all([
        supabase
          .from("finance_clients")
          .select(
            "id, name, legal_name, contact_person, company_email, personnel_email, company_phone, personnel_phone, currency_code, payment_terms_days, payment_terms_id, country, city, state_province, postal_code, address_line_1, address_line_2"
          )
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_companies")
          .select(
            "id, name, legal_name, contact_person, email, phone, currency_code, country, city, state_province, postal_code, address_line_1, address_line_2"
          )
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase.from("projects").select("id, name").order("name", {
          ascending: true,
        }),

        supabase
          .from("tasks")
          .select("id, title, project_id")
          .order("created_at", { ascending: false }),

        supabase
          .from("finance_currencies")
          .select("id, currency_code, currency_name")
          .eq("status", "active")
          .order("currency_code", { ascending: true }),

        supabase
          .from("finance_payment_terms")
          .select(
            "id, code, name, due_days, is_default, document_label, document_terms_text"
          )
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_shipping_terms")
          .select("id, code, name, description, is_default")
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_bank_accounts")
          .select(
            "id, name, bank_name, institution_name, beneficiary_name, iban, swift_code, bank_address, account_number, masked_account_number, account_identifier_type, account_identifier_value, country, city, postal_code, address_line_1, address_line_2, currency_code, is_default, company_id"
          )
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_payment_methods")
          .select("id, code, name")
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_items")
          .select(
            "id, name, description, sales_price, currency_code, revenue_category_id, tax_code_id, unit_of_measure_id"
          )
          .eq("status", "active")
          .eq("is_active_for_sales", true)
          .order("name", { ascending: true }),

        supabase
          .from("finance_tax_codes")
          .select("id, code, name, rate_percent")
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_units_of_measure")
          .select("id, code, name")
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_revenue_categories")
          .select("id, code, name")
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_client_purchase_orders")
          .select(
            "id, client_po_number, external_po_number, quotation_id, proforma_invoice_id, client_id, company_id, po_date, received_at, status, currency_id, currency_code, total_amount, notes, project_id, task_id"
          )
          .in("status", ["received", "linked_to_pi"])
          .order("received_at", { ascending: false }),
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (tasksResult.error) throw tasksResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (paymentTermsResult.error) throw paymentTermsResult.error;
      if (shippingTermsResult.error) throw shippingTermsResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (paymentMethodsResult.error) throw paymentMethodsResult.error;
      if (itemsResult.error) throw itemsResult.error;
      if (taxCodesResult.error) throw taxCodesResult.error;
      if (unitsOfMeasureResult.error) throw unitsOfMeasureResult.error;
      if (revenueCategoriesResult.error) throw revenueCategoriesResult.error;
      if (customerPoSourcesResult.error) throw customerPoSourcesResult.error;

      setClients((clientsResult.data || []) as ClientOption[]);
      setCompanies((companiesResult.data || []) as CompanyOption[]);
      setProjects((projectsResult.data || []) as ProjectRow[]);
      setTasks((tasksResult.data || []) as TaskRow[]);
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
      setPaymentTerms((paymentTermsResult.data || []) as PaymentTermOption[]);
      setShippingTerms((shippingTermsResult.data || []) as ShippingTermOption[]);
      setBankAccounts((bankAccountsResult.data || []) as BankAccountOption[]);
      setPaymentMethods(
        (paymentMethodsResult.data || []) as PaymentMethodOption[]
      );
      setItems((itemsResult.data || []) as ItemOption[]);
      setTaxCodes((taxCodesResult.data || []) as TaxCodeOption[]);
      setUnitsOfMeasure(
        (unitsOfMeasureResult.data || []) as UnitOfMeasureOption[]
      );
      setRevenueCategories(
        (revenueCategoriesResult.data || []) as RevenueCategoryOption[]
      );
      setCustomerPoSources(
        (customerPoSourcesResult.data || []) as CustomerPoSource[]
      );
    } catch (err) {
      console.error("Failed to load proforma invoice master data:", err);
    }
  }, []);

  useEffect(() => {
    void loadProforma();
    void loadMasterData();
    void loadArchiveItems();
  }, [loadArchiveItems, loadMasterData, loadProforma]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`proforma-invoice-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_proforma_invoices",
          filter: `id=eq.${id}`,
        },
        () => void loadProforma(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_proforma_invoice_line_items",
          filter: `proforma_invoice_id=eq.${id}`,
        },
        () => void loadProforma(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_invoices_issued",
        },
        () => void loadProforma(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_client_purchase_orders",
        },
        () => void loadProforma(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadProforma]);

  const selectedDraftClient = useMemo(
    () => clients.find((client) => client.id === clientIdDraft) ?? null,
    [clientIdDraft, clients]
  );

  const selectedDraftCompany = useMemo(
    () => companies.find((company) => company.id === companyIdDraft) ?? null,
    [companies, companyIdDraft]
  );

  const selectedDraftProject = useMemo(
    () => projects.find((entry) => entry.id === projectIdDraft) ?? null,
    [projectIdDraft, projects]
  );

  const selectedDraftTask = useMemo(
    () => tasks.find((entry) => entry.id === taskIdDraft) ?? null,
    [taskIdDraft, tasks]
  );

  const selectedDraftCurrency = useMemo(
    () => currencies.find((entry) => entry.id === currencyIdDraft) ?? null,
    [currencies, currencyIdDraft]
  );

  const selectedDraftPaymentTerm = useMemo(
    () => paymentTerms.find((entry) => entry.id === paymentTermsIdDraft) ?? null,
    [paymentTerms, paymentTermsIdDraft]
  );

  const selectedDraftShippingTerm = useMemo(
    () => shippingTerms.find((entry) => entry.id === shippingTermIdDraft) ?? null,
    [shippingTerms, shippingTermIdDraft]
  );

  const selectedDraftShippingTermsLabel = useMemo(
    () => getShippingTermLabel(selectedDraftShippingTerm),
    [selectedDraftShippingTerm]
  );

  const selectedDraftPaymentMethod = useMemo(
    () =>
      paymentMethods.find((entry) => entry.id === paymentMethodIdDraft) ?? null,
    [paymentMethodIdDraft, paymentMethods]
  );

  const filteredDraftTasks = useMemo(() => {
    if (!projectIdDraft) return tasks;
    return tasks.filter((taskItem) => taskItem.project_id === projectIdDraft);
  }, [projectIdDraft, tasks]);

  const filteredDraftBankAccounts = useMemo(() => {
    if (!companyIdDraft) return bankAccounts;

    return bankAccounts.filter(
      (account) => !account.company_id || account.company_id === companyIdDraft
    );
  }, [bankAccounts, companyIdDraft]);

  const selectedDraftBankAccount = useMemo(
    () =>
      filteredDraftBankAccounts.find(
        (account) => account.id === bankAccountIdDraft
      ) ?? null,
    [bankAccountIdDraft, filteredDraftBankAccounts]
  );

  const selectableCustomerPos = useMemo(() => {
    if (!proforma) return customerPoSources;

    const currentClientPoId = resolveProformaClientPoId(proforma);

    return customerPoSources.filter(
      (po) =>
        !po.proforma_invoice_id ||
        po.proforma_invoice_id === proforma.id ||
        po.id === currentClientPoId
    );
  }, [customerPoSources, proforma]);

  const resolvedDraftCompanyAddress = useMemo(
    () => buildCompanyAddress(selectedDraftCompany),
    [selectedDraftCompany]
  );

  const resolvedDraftRecipientAddress = useMemo(
    () => buildClientAddress(selectedDraftClient),
    [selectedDraftClient]
  );

  const resolvedBankDetailsLines = useMemo(
    () => buildBankDetailsLinesFromAccount(selectedDraftBankAccount),
    [selectedDraftBankAccount]
  );

  const totals = useMemo(() => {
    if (!proforma) return null;

    return {
      subtotal: toNumber(proforma.subtotal),
      discount: toNumber(proforma.discount_amount),
      tax: toNumber(proforma.tax_amount),
      total: toNumber(proforma.total_amount),
      paid: toNumber(proforma.paid_amount),
      balance: toNumber(proforma.balance_due),
    };
  }, [proforma]);

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
      const qty = toNumber(row.quantity);
      const price = toNumber(row.unit_price);
      const rowDiscount = toNumber(row.discount);
      const base = Math.max(qty * price - rowDiscount, 0);
      const taxCode = taxCodes.find(
        (taxCodeItem) => taxCodeItem.id === row.tax_code_id
      );

      if (!taxCode) return sum;

      const rate = toNumber(taxCode.rate_percent) / 100;
      return sum + base * rate;
    }, 0);

    const total = Math.max(subtotal - discount + tax, 0);

    return {
      subtotal,
      discount,
      tax,
      total,
    };
  }, [lineItemsDraft, taxCodes]);

  const canEditDraft = proforma?.status === "draft";
  const canMarkIssued = proforma?.status === "draft";
  const canConfirm = proforma?.status === "issued";
  const canConvert = proforma?.status === "confirmed";
  const canArchive =
    !!proforma &&
    !["archived", "deleted", "converted"].includes(proforma.status);
  const canRecordPayment =
    !!proforma &&
    ["issued", "confirmed"].includes(proforma.status) &&
    toNumber(proforma.balance_due) > 0;

  const financialSummary = useMemo(() => {
    if (!proforma || !totals) return null;

    if (canEditDraft) {
      const paid = totals.paid;
      return {
        subtotal: draftTotals.subtotal,
        discount: draftTotals.discount,
        tax: draftTotals.tax,
        total: draftTotals.total,
        paid,
        balance: draftTotals.total - paid,
      };
    }

    return totals;
  }, [canEditDraft, draftTotals, proforma, totals]);

  const printableCurrencyCode =
    selectedDraftCurrency?.currency_code ||
    proforma?.currency_code ||
    getMetadataString(proforma?.metadata, "currency_code") ||
    "USD";

  const printableProforma = useMemo(() => {
    if (!proforma) return proforma;

    const metadata = proforma.metadata || {};

    return {
      ...proforma,
      company_name_snapshot:
        selectedDraftCompany?.legal_name ||
        selectedDraftCompany?.name ||
        getMetadataString(metadata, "company_name_snapshot") ||
        null,
      company_contact_person_snapshot:
        selectedDraftCompany?.contact_person ||
        getMetadataString(metadata, "company_contact_person_snapshot") ||
        null,
      company_address_snapshot:
        resolvedDraftCompanyAddress ||
        getMetadataString(metadata, "company_address_snapshot") ||
        null,
      company_email_snapshot:
        selectedDraftCompany?.email ||
        getMetadataString(metadata, "company_email_snapshot") ||
        null,
      company_phone_snapshot:
        selectedDraftCompany?.phone ||
        getMetadataString(metadata, "company_phone_snapshot") ||
        null,
      client_name_snapshot:
        selectedDraftClient?.legal_name ||
        selectedDraftClient?.name ||
        getMetadataString(metadata, "client_name_snapshot") ||
        null,
      client_contact_person_snapshot:
        selectedDraftClient?.contact_person ||
        getMetadataString(metadata, "client_contact_person_snapshot") ||
        null,
      client_email_snapshot:
        selectedDraftClient?.company_email ||
        selectedDraftClient?.personnel_email ||
        getMetadataString(metadata, "client_email_snapshot") ||
        null,
      client_phone_snapshot:
        selectedDraftClient?.company_phone ||
        selectedDraftClient?.personnel_phone ||
        getMetadataString(metadata, "client_phone_snapshot") ||
        null,
      billing_address_snapshot:
        resolvedDraftRecipientAddress ||
        getMetadataString(metadata, "billing_address_snapshot") ||
        null,
      payment_terms_snapshot:
        selectedDraftPaymentTerm?.document_label ||
        selectedDraftPaymentTerm?.name ||
        proforma.payment_terms_snapshot ||
        "—",
      payment_terms_document_text:
        selectedDraftPaymentTerm?.document_terms_text ||
        proforma.payment_terms_document_text ||
        "",
      shipping_terms_snapshot:
        selectedDraftShippingTermsLabel !== "—"
          ? selectedDraftShippingTermsLabel
          : proforma.shipping_terms_snapshot ||
            getMetadataString(metadata, "shipping_terms_snapshot") ||
            null,
      terms_and_conditions_snapshot:
        termsAndConditionsDraft ||
        proforma.terms_and_conditions_snapshot ||
        getMetadataString(metadata, "terms_and_conditions_snapshot") ||
        null,
      bank_details_snapshot:
        buildBankDetailsSnapshotFromAccount(selectedDraftBankAccount) ||
        getMetadataString(metadata, "bank_details_snapshot") ||
        null,
      currency_code: printableCurrencyCode,
    };
  }, [
    proforma,
    selectedDraftCompany,
    resolvedDraftCompanyAddress,
    selectedDraftClient,
    resolvedDraftRecipientAddress,
    selectedDraftPaymentTerm,
    selectedDraftShippingTermsLabel,
    selectedDraftBankAccount,
    termsAndConditionsDraft,
    printableCurrencyCode,
  ]);

  useEffect(() => {
    if (!proforma || proforma.status !== "draft" || !selectedDraftClient) {
      return;
    }

    if (sourceModeDraft === "customer_po" && sourceCustomerPoIdDraft) {
      return;
    }

    if (selectedDraftClient.currency_code && !currencyIdDraft) {
      const matchedCurrency = currencies.find(
        (currency) =>
          currency.currency_code === selectedDraftClient.currency_code
      );

      if (matchedCurrency) {
        setCurrencyIdDraft(matchedCurrency.id);
      }
    }

    if (selectedDraftClient.payment_terms_id && !paymentTermsIdDraft) {
      setPaymentTermsIdDraft(selectedDraftClient.payment_terms_id);
    }

    if (!validUntilDraft) {
      const days = selectedDraftClient.payment_terms_days ?? 14;
      const base = new Date(
        issueDateDraft || new Date().toISOString().slice(0, 10)
      );
      base.setDate(base.getDate() + days);
      setValidUntilDraft(base.toISOString().slice(0, 10));
    }
  }, [
    currencies,
    currencyIdDraft,
    issueDateDraft,
    paymentTermsIdDraft,
    proforma,
    selectedDraftClient,
    sourceCustomerPoIdDraft,
    sourceModeDraft,
    validUntilDraft,
  ]);

  useEffect(() => {
    if (!proforma || proforma.status !== "draft") return;

    const taskStillValid = filteredDraftTasks.some(
      (taskItem) => taskItem.id === taskIdDraft
    );

    if (taskIdDraft && !taskStillValid) {
      setTaskIdDraft("");
    }
  }, [filteredDraftTasks, proforma, taskIdDraft]);

  useEffect(() => {
    if (!proforma || proforma.status !== "draft" || !companyIdDraft) return;

    const selectedBankStillBelongsToCompany =
      !bankAccountIdDraft ||
      filteredDraftBankAccounts.some(
        (account) => account.id === bankAccountIdDraft
      );

    if (!selectedBankStillBelongsToCompany) {
      setBankAccountIdDraft("");
    }

    const defaultBank =
      filteredDraftBankAccounts.find((account) => account.is_default) ??
      filteredDraftBankAccounts[0];

    if (defaultBank && !bankAccountIdDraft) {
      setBankAccountIdDraft(defaultBank.id);
    }

    if (!currencyIdDraft && selectedDraftCompany?.currency_code) {
      const matchedCurrency = currencies.find(
        (currency) =>
          currency.currency_code === selectedDraftCompany.currency_code
      );

      if (matchedCurrency) {
        setCurrencyIdDraft(matchedCurrency.id);
      }
    }
  }, [
    bankAccountIdDraft,
    companyIdDraft,
    currencies,
    currencyIdDraft,
    filteredDraftBankAccounts,
    proforma,
    selectedDraftCompany,
  ]);

  const applyCustomerPoSourceToDraft = useCallback(
    async (customerPoId: string) => {
      if (!customerPoId) {
        setSourceModeDraft("manual");
        setSourceCustomerPoIdDraft("");
        setLinkedCustomerPo(null);
        setLineItemsDraft([createEditableDraftLineItem()]);
        return;
      }

      setError("");

      const { data: customerPoData, error: customerPoError } = await supabase
        .from("finance_client_purchase_orders")
        .select(
          "id, client_po_number, external_po_number, quotation_id, proforma_invoice_id, client_id, company_id, po_date, received_at, status, currency_id, currency_code, total_amount, notes, project_id, task_id"
        )
        .eq("id", customerPoId)
        .maybeSingle();

      if (customerPoError) throw customerPoError;

      const customerPo = (customerPoData || null) as CustomerPoSource | null;

      if (!customerPo) {
        setError("Customer PO source was not found.");
        return;
      }

      if (
        customerPo.proforma_invoice_id &&
        customerPo.proforma_invoice_id !== id
      ) {
        setError("This Customer PO is already linked to another proforma invoice.");
        return;
      }

      if (!["received", "linked_to_pi"].includes(customerPo.status)) {
        setError(
          "Customer PO must be received before it can be linked to a proforma invoice."
        );
        return;
      }

      setSourceModeDraft("customer_po");
      setSourceCustomerPoIdDraft(customerPo.id);
      setLinkedCustomerPo(customerPo);

      setClientIdDraft(customerPo.client_id || "");
      setCompanyIdDraft(customerPo.company_id || "");
      setProjectIdDraft(customerPo.project_id || "");
      setTaskIdDraft(customerPo.task_id || "");
      setCurrencyIdDraft(customerPo.currency_id || "");

      const matchedCurrency = currencies.find(
        (currency) =>
          currency.id === customerPo.currency_id ||
          currency.currency_code === customerPo.currency_code
      );

      if (matchedCurrency) {
        setCurrencyIdDraft(matchedCurrency.id);
      }

      setNotesDraft(
        [
          `Source Customer PO: ${
            customerPo.client_po_number ||
            customerPo.external_po_number ||
            customerPo.id
          }`,
          customerPo.notes || "",
        ]
          .filter(Boolean)
          .join("\n")
      );

      const { data: customerPoLinesData, error: customerPoLinesError } =
        await supabase
          .from("finance_client_purchase_order_line_items")
          .select(
            "id, client_po_id, item_id, description, quantity, unit_price, discount, sort_order, unit_of_measure_id, tax_code_id, revenue_category_id, project_id, task_id, status"
          )
          .eq("client_po_id", customerPo.id)
          .or("status.is.null,status.neq.deleted")
          .order("sort_order", { ascending: true });

      if (customerPoLinesError) throw customerPoLinesError;

      const customerPoLines =
        (customerPoLinesData || []) as CustomerPoLineSource[];

      setLineItemsDraft(
        customerPoLines.length > 0
          ? customerPoLines.map((line) => ({
              id: `new_${crypto.randomUUID()}`,
              item_id: line.item_id || "",
              description: line.description || "",
              quantity: String(line.quantity ?? 1),
              unit_price: String(line.unit_price ?? 0),
              discount: String(line.discount ?? 0),
              tax_code_id: line.tax_code_id || "",
              unit_of_measure_id: line.unit_of_measure_id || "",
              revenue_category_id: line.revenue_category_id || "",
            }))
          : [
              {
                id: `new_${crypto.randomUUID()}`,
                item_id: "",
                description: `Customer PO ${
                  customerPo.external_po_number ||
                  customerPo.client_po_number ||
                  ""
                }`.trim(),
                quantity: "1",
                unit_price: String(toNumber(customerPo.total_amount)),
                discount: "0",
                tax_code_id: "",
                unit_of_measure_id: "",
                revenue_category_id: "",
              },
            ]
      );
    },
    [currencies, id]
  );

  const handleMarkIssued = useCallback(async () => {
    if (!proforma || !id) return;

    setIsSavingDraft(true);
    setError("");

    try {
      const { error: snapshotError } = await supabase
        .from("finance_proforma_invoices")
        .update({
          payment_terms_id: paymentTermsIdDraft || null,
          payment_terms_snapshot:
            selectedDraftPaymentTerm?.document_label ||
            selectedDraftPaymentTerm?.name ||
            null,
          shipping_term_id: shippingTermIdDraft || null,
          shipping_terms_snapshot:
            selectedDraftShippingTermsLabel !== "—"
              ? selectedDraftShippingTermsLabel
              : null,
          terms_and_conditions_snapshot: termsAndConditionsDraft || null,
          metadata: {
            ...(proforma.metadata || {}),
            issuing_company_id: companyIdDraft || null,
            issuing_company_name:
              selectedDraftCompany?.legal_name ||
              selectedDraftCompany?.name ||
              null,
            company_name_snapshot:
              selectedDraftCompany?.legal_name ||
              selectedDraftCompany?.name ||
              null,
            company_contact_person_snapshot:
              selectedDraftCompany?.contact_person || null,
            company_address_snapshot: resolvedDraftCompanyAddress || null,
            company_email_snapshot: selectedDraftCompany?.email || null,
            company_phone_snapshot: selectedDraftCompany?.phone || null,
            client_name_snapshot:
              selectedDraftClient?.legal_name ||
              selectedDraftClient?.name ||
              null,
            client_contact_person_snapshot:
              selectedDraftClient?.contact_person || null,
            client_email_snapshot:
              selectedDraftClient?.company_email ||
              selectedDraftClient?.personnel_email ||
              null,
            client_phone_snapshot:
              selectedDraftClient?.company_phone ||
              selectedDraftClient?.personnel_phone ||
              null,
            billing_address_snapshot: resolvedDraftRecipientAddress || null,
            shipping_term_id: shippingTermIdDraft || null,
            shipping_terms_snapshot:
              selectedDraftShippingTermsLabel !== "—"
                ? selectedDraftShippingTermsLabel
                : null,
            bank_account_id: bankAccountIdDraft || null,
            bank_details_snapshot:
              buildBankDetailsSnapshotFromAccount(selectedDraftBankAccount),
            preferred_payment_method_id: paymentMethodIdDraft || null,
            preferred_payment_method_name:
              selectedDraftPaymentMethod?.name || null,
            preferred_payment_method_code:
              selectedDraftPaymentMethod?.code || null,
            currency_code: printableCurrencyCode,
            client_po_id:
              sourceModeDraft === "customer_po"
                ? sourceCustomerPoIdDraft || null
                : null,
            client_po_number:
              sourceModeDraft === "customer_po"
                ? linkedCustomerPo?.client_po_number || null
                : null,
            external_po_number:
              sourceModeDraft === "customer_po"
                ? linkedCustomerPo?.external_po_number || null
                : null,
            quotation_id:
              sourceModeDraft === "customer_po"
                ? linkedCustomerPo?.quotation_id || null
                : resolveProformaQuotationId(proforma) || null,
          },
        })
        .eq("id", id)
        .eq("status", "draft");

      if (snapshotError) throw snapshotError;

      const { error: updateError } = await supabase
        .from("finance_proforma_invoices")
        .update({
          status: "issued",
        })
        .eq("id", id)
        .eq("status", "draft");

      if (updateError) throw updateError;

      await loadProforma(true);
    } catch (err) {
      console.error(err);
      setError("Failed to mark proforma invoice as issued.");
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    bankAccountIdDraft,
    companyIdDraft,
    id,
    linkedCustomerPo,
    loadProforma,
    paymentMethodIdDraft,
    paymentTermsIdDraft,
    printableCurrencyCode,
    proforma,
    resolvedDraftCompanyAddress,
    resolvedDraftRecipientAddress,
    selectedDraftBankAccount,
    selectedDraftClient,
    selectedDraftCompany,
    selectedDraftPaymentMethod,
    selectedDraftPaymentTerm,
    selectedDraftShippingTermsLabel,
    shippingTermIdDraft,
    sourceCustomerPoIdDraft,
    sourceModeDraft,
    termsAndConditionsDraft,
  ]);

  const handleConfirm = useCallback(async () => {
    if (!proforma || !id) return;

    setIsSavingDraft(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("finance_proforma_invoices")
        .update({
          status: "confirmed",
        })
        .eq("id", id)
        .eq("status", "issued");

      if (updateError) throw updateError;

      await loadProforma(true);
    } catch (err) {
      console.error(err);
      setError("Failed to mark proforma invoice as confirmed.");
    } finally {
      setIsSavingDraft(false);
    }
  }, [id, loadProforma, proforma]);

  const handleConvert = useCallback(async () => {
    if (!proforma || !id) return;

    setIsConverting(true);
    setError("");

    try {
      const invoiceId = await convertProformaToInvoice(id);
      await loadProforma(true);

      if (invoiceId) {
        navigate(`/finance/transactions/invoices/${invoiceId}`);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to convert proforma invoice.");
    } finally {
      setIsConverting(false);
    }
  }, [id, loadProforma, navigate, proforma]);

  const handleDelete = useCallback(async () => {
    if (!proforma || !id) return;

    setIsDeleting(true);
    setError("");

    try {
      const { data: confirmedPayments, error: paymentsError } = await supabase
        .from("finance_payments_received")
        .select("id")
        .eq("proforma_invoice_id", id)
        .eq("status", "confirmed");
      if (paymentsError) throw paymentsError;
      if (confirmedPayments && confirmedPayments.length > 0) {
        throw new Error("Cannot delete proforma invoice with existing payments.");
      }

      await softDeleteProformaInvoice(id);

      setEditingOverview(false);
      setEditingFinancialSettings(false);
      setEditingDocumentDetails(false);
      setEditingLines(false);

      await loadProforma(true);
      await loadArchiveItems();
      setShowArchivePopup(true);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to delete proforma invoice.");
    } finally {
      setIsDeleting(false);
    }
  }, [id, loadArchiveItems, loadProforma, proforma]);

  const handleArchive = useCallback(async () => {
    if (!proforma || !id) return;

    setIsArchiving(true);
    setError("");

    try {
      await archiveProformaInvoice(id);

      setEditingOverview(false);
      setEditingFinancialSettings(false);
      setEditingDocumentDetails(false);
      setEditingLines(false);

      await loadProforma(true);
      await loadArchiveItems();
      setShowArchivePopup(true);
    } catch (err) {
      console.error(err);
      setError("Failed to move proforma invoice to archive.");
    } finally {
      setIsArchiving(false);
    }
  }, [id, loadArchiveItems, loadProforma, proforma]);

  const handleRestore = useCallback(
    async (proformaId: string) => {
      setIsSavingDraft(true);
      setError("");

      try {
        await restoreProformaInvoice(proformaId);
        await Promise.all([loadProforma(true), loadArchiveItems()]);
      } catch (err) {
        console.error(err);
        setError("Failed to restore proforma invoice.");
      } finally {
        setIsSavingDraft(false);
      }
    },
    [loadArchiveItems, loadProforma]
  );

  const handleHardDelete = useCallback(
    async (proformaId: string) => {
      setIsDeleting(true);
      setError("");

      try {
        const { data: confirmedPayments, error: paymentsError } = await supabase
          .from("finance_payments_received")
          .select("id")
          .eq("proforma_invoice_id", proformaId)
          .eq("status", "confirmed");
        if (paymentsError) throw paymentsError;
        if (confirmedPayments && confirmedPayments.length > 0) {
          throw new Error("Cannot delete proforma invoice with existing payments.");
        }

        await permanentlyDeleteProformaInvoice(proformaId);

        if (proformaId === id) {
          navigate("/finance/transactions/proforma-invoices");
          return;
        }

        await loadArchiveItems();
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to permanently delete archived proforma invoice.");
      } finally {
        setIsDeleting(false);
      }
    },
    [id, loadArchiveItems, navigate]
  );

  const applyDraftItemSelection = useCallback(
    (lineId: string, itemId: string) => {
      const selectedItem = items.find((item) => item.id === itemId);

      setLineItemsDraft((current) =>
        current.map((entry) => {
          if (entry.id !== lineId) return entry;

          if (!selectedItem) {
            return {
              ...entry,
              item_id: "",
            };
          }

          return {
            ...entry,
            item_id: selectedItem.id,
            description: selectedItem.description || selectedItem.name,
            unit_price: String(selectedItem.sales_price ?? 0),
            tax_code_id: selectedItem.tax_code_id || "",
            unit_of_measure_id: selectedItem.unit_of_measure_id || "",
            revenue_category_id: selectedItem.revenue_category_id || "",
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
        return [createEditableDraftLineItem()];
      }

      const isLastEmpty =
        !last.description.trim() &&
        toNumber(last.quantity) === 0 &&
        toNumber(last.unit_price) === 0;

      if (isLastEmpty) {
        return current;
      }

      return [...current, createEditableDraftLineItem()];
    });
  }, []);

  const removeDraftLineItem = useCallback((lineId: string) => {
    setLineItemsDraft((current) => {
      const nextRows = current.filter((entry) => entry.id !== lineId);

      return nextRows.length > 0 ? nextRows : [createEditableDraftLineItem()];
    });
  }, []);

  const handleSaveDraftChanges = useCallback(async () => {
    if (!proforma || !id || !canEditDraft) return;

    setIsSavingDraft(true);
    setError("");

    const cleanedLineItems = lineItemsDraft.map((row) => ({
      ...row,
      description: row.description.trim(),
    }));

    const hasAtLeastOneValidLine = cleanedLineItems.some(
      (row) =>
        row.description &&
        toNumber(row.quantity) > 0 &&
        toNumber(row.unit_price) >= 0
    );

    if (!hasAtLeastOneValidLine) {
      setError("Draft proforma invoice must include at least one valid line item.");
      setIsSavingDraft(false);
      return;
    }

    const hasInvalidLine = cleanedLineItems.some(
      (row) =>
        !row.description ||
        toNumber(row.quantity) <= 0 ||
        toNumber(row.unit_price) < 0
    );

    if (hasInvalidLine) {
      setError(
        "Every draft proforma line must have a description, quantity greater than 0, and unit price 0 or higher."
      );
      setIsSavingDraft(false);
      return;
    }

    try {
      const selectedCurrency =
        currencies.find((currency) => currency.id === currencyIdDraft) || null;

      const selectedPaymentTerm =
        paymentTerms.find((term) => term.id === paymentTermsIdDraft) || null;

      const selectedShippingTerm =
        shippingTerms.find((term) => term.id === shippingTermIdDraft) || null;

      const selectedPaymentMethod =
        paymentMethods.find((method) => method.id === paymentMethodIdDraft) ||
        null;

      const selectedCustomerPo =
        sourceModeDraft === "customer_po"
          ? customerPoSources.find((po) => po.id === sourceCustomerPoIdDraft) ||
            linkedCustomerPo
          : null;

      const selectedShippingTermsText =
        selectedShippingTerm?.description?.trim()
          ? `${selectedShippingTerm.name} — ${selectedShippingTerm.description.trim()}`
          : selectedShippingTerm?.name || selectedShippingTerm?.code || null;

      const nextMetadata = {
        ...(proforma.metadata || {}),
        issuing_company_id: companyIdDraft || null,
        issuing_company_name:
          selectedDraftCompany?.legal_name || selectedDraftCompany?.name || null,
        company_name_snapshot:
          selectedDraftCompany?.legal_name || selectedDraftCompany?.name || null,
        company_contact_person_snapshot:
          selectedDraftCompany?.contact_person || null,
        company_address_snapshot: resolvedDraftCompanyAddress || null,
        company_email_snapshot: selectedDraftCompany?.email || null,
        company_phone_snapshot: selectedDraftCompany?.phone || null,
        client_name_snapshot:
          selectedDraftClient?.legal_name || selectedDraftClient?.name || null,
        client_contact_person_snapshot:
          selectedDraftClient?.contact_person || null,
        client_email_snapshot:
          selectedDraftClient?.company_email ||
          selectedDraftClient?.personnel_email ||
          null,
        client_phone_snapshot:
          selectedDraftClient?.company_phone ||
          selectedDraftClient?.personnel_phone ||
          null,
        billing_address_snapshot: resolvedDraftRecipientAddress || null,
        payment_terms_id: paymentTermsIdDraft || null,
        payment_terms_snapshot:
          selectedPaymentTerm?.document_label || selectedPaymentTerm?.name || null,
        payment_terms_document_text:
          selectedPaymentTerm?.document_terms_text || null,
        shipping_term_id: shippingTermIdDraft || null,
        shipping_terms_snapshot: selectedShippingTermsText,
        terms_and_conditions_snapshot: termsAndConditionsDraft || null,
        bank_account_id: bankAccountIdDraft || null,
        bank_account_name: selectedDraftBankAccount?.name || null,
        bank_name:
          selectedDraftBankAccount?.bank_name ||
          selectedDraftBankAccount?.institution_name ||
          null,
        beneficiary_name: selectedDraftBankAccount?.beneficiary_name || null,
        bank_address_snapshot:
          buildBankAddressFromAccount(selectedDraftBankAccount) || null,
        bank_details_snapshot:
          buildBankDetailsSnapshotFromAccount(selectedDraftBankAccount),
        iban: selectedDraftBankAccount?.iban || null,
        swift_code:
          selectedDraftBankAccount?.swift_code ||
          (selectedDraftBankAccount?.account_identifier_type?.toLowerCase() ===
          "swift"
            ? selectedDraftBankAccount?.account_identifier_value
            : null),
        bank_identifier_type:
          selectedDraftBankAccount?.account_identifier_type || null,
        bank_identifier_value:
          selectedDraftBankAccount?.account_identifier_value || null,
        account_number:
          selectedDraftBankAccount?.account_number ||
          selectedDraftBankAccount?.masked_account_number ||
          null,
        bank_account_currency_code:
          selectedDraftBankAccount?.currency_code || null,
        preferred_payment_method_id: paymentMethodIdDraft || null,
        preferred_payment_method_name: selectedPaymentMethod?.name || null,
        preferred_payment_method_code: selectedPaymentMethod?.code || null,
        currency_code:
          selectedCurrency?.currency_code ||
          selectedDraftCurrency?.currency_code ||
          getMetadataString(proforma.metadata, "currency_code") ||
          "USD",
        creation_mode:
          sourceModeDraft === "customer_po"
            ? "customer_po_prefill"
            : "manual_draft",
        client_po_id:
          sourceModeDraft === "customer_po"
            ? sourceCustomerPoIdDraft || null
            : null,
        client_po_number:
          sourceModeDraft === "customer_po"
            ? selectedCustomerPo?.client_po_number || null
            : null,
        external_po_number:
          sourceModeDraft === "customer_po"
            ? selectedCustomerPo?.external_po_number || null
            : null,
        quotation_id:
          sourceModeDraft === "customer_po"
            ? selectedCustomerPo?.quotation_id || null
            : null,
      };

      const { error: deleteOldLinesError } = await supabase
        .from("finance_proforma_invoice_line_items")
        .delete()
        .eq("proforma_invoice_id", id);

      if (deleteOldLinesError) throw deleteOldLinesError;

      const { error: rpcError } = await supabase.rpc(
        "finance_update_proforma_invoice_draft",
        {
          p_proforma_id: id,
          p_client_id: clientIdDraft || null,
          p_issue_date: issueDateDraft,
          p_valid_until: validUntilDraft || null,
          p_currency_id: currencyIdDraft || null,
          p_project_id: projectIdDraft || null,
          p_task_id: taskIdDraft || null,
          p_notes: notesDraft || null,
          p_metadata: nextMetadata,
          p_lines: cleanedLineItems.map((row) => ({
            id: `new_${crypto.randomUUID()}`,
            item_id: row.item_id || null,
            description: row.description.trim(),
            quantity: toNumber(row.quantity),
            unit_price: toNumber(row.unit_price),
            discount: toNumber(row.discount),
            tax_code_id: row.tax_code_id || null,
            unit_of_measure_id: row.unit_of_measure_id || null,
            revenue_category_id: row.revenue_category_id || null,
          })),
        }
      );

      if (rpcError) throw rpcError;

          const { error: snapshotError } = await supabase
        .from("finance_proforma_invoices")
        .update({
          company_id: companyIdDraft || null,
          client_po_id:
            sourceModeDraft === "customer_po"
              ? sourceCustomerPoIdDraft || null
              : null,
          quotation_id:
            sourceModeDraft === "customer_po"
              ? selectedCustomerPo?.quotation_id || null
              : null,
          payment_terms_id: paymentTermsIdDraft || null,
          shipping_term_id: shippingTermIdDraft || null,
          bank_account_id: bankAccountIdDraft || null,
          currency_code:
            selectedCurrency?.currency_code ||
            selectedDraftCurrency?.currency_code ||
            getMetadataString(proforma.metadata, "currency_code") ||
            "USD",
          payment_terms_snapshot:
            selectedPaymentTerm?.document_label ||
            selectedPaymentTerm?.name ||
            null,
          shipping_terms_snapshot: selectedShippingTermsText,
          terms_and_conditions_snapshot: termsAndConditionsDraft || null,
          metadata: nextMetadata,
        })
        .eq("id", id)
        .eq("status", "draft");

      if (snapshotError) throw snapshotError;

      if (sourceModeDraft === "customer_po" && sourceCustomerPoIdDraft) {
        const { error: linkPoError } = await supabase
          .from("finance_client_purchase_orders")
          .update({
            proforma_invoice_id: id,
            status: "linked_to_pi",
            linked_to_pi_at: new Date().toISOString(),
          })
          .eq("id", sourceCustomerPoIdDraft);

        if (linkPoError) throw linkPoError;
      }

      const previousCustomerPoId = resolveProformaClientPoId(proforma);

      if (
        previousCustomerPoId &&
        previousCustomerPoId !== sourceCustomerPoIdDraft
      ) {
        const { error: unlinkPoError } = await supabase
          .from("finance_client_purchase_orders")
          .update({
            proforma_invoice_id: null,
            status: "received",
            linked_to_pi_at: null,
          })
          .eq("id", previousCustomerPoId)
          .eq("proforma_invoice_id", id);

        if (unlinkPoError) throw unlinkPoError;
      }

      setEditingOverview(false);
      setEditingFinancialSettings(false);
      setEditingDocumentDetails(false);
      setEditingLines(false);
      await loadProforma(true);
    } catch (err) {
      console.error(err);
      setError("Failed to save draft changes.");
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    bankAccountIdDraft,
    canEditDraft,
    clientIdDraft,
    companyIdDraft,
    currencies,
    currencyIdDraft,
    customerPoSources,
    id,
    issueDateDraft,
    lineItemsDraft,
    linkedCustomerPo,
    loadProforma,
    notesDraft,
    paymentMethodIdDraft,
    paymentMethods,
    paymentTerms,
    paymentTermsIdDraft,
    proforma,
    projectIdDraft,
    resolvedDraftCompanyAddress,
    resolvedDraftRecipientAddress,
    selectedDraftBankAccount,
    selectedDraftClient,
    selectedDraftCompany,
    selectedDraftCurrency,
    shippingTermIdDraft,
    shippingTerms,
    sourceCustomerPoIdDraft,
    sourceModeDraft,
    taskIdDraft,
    termsAndConditionsDraft,
    validUntilDraft,
  ]);

  const visibleArchiveItems = archiveItems.filter(
    (item) => item.status === archiveTab
  );
  const archivedArchiveCount = archiveItems.filter(
    (item) => item.status === "archived"
  ).length;
  const deletedArchiveCount = archiveItems.filter(
    (item) => item.status === "deleted"
  ).length;

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading proforma invoice"
        description="Proforma invoice document data, line items, linked documents, and master data are loading."
      />
    );
  }

  if (!proforma || !totals) {
    return (
      <AixiaPage>
        <AixiaEmptyState
          icon={FileText}
          title="Proforma invoice not found"
          description="The requested proforma invoice could not be loaded."
        />
      </AixiaPage>
    );
  }

  const paymentProgressPercent = (() => {
    const total = Number(proforma.total_amount || 0);
    const paid = Number(proforma.paid_amount || 0);
    if (total <= 0) return 0;
    return Math.max(0, Math.min((paid / total) * 100, 100));
  })();

  const overviewActions = canEditDraft ? (
    editingOverview ? (
      <>
        <AixiaButton
          type="button"
          variant="primary"
          disabled={isSavingDraft}
          onClick={() => void handleSaveDraftChanges()}
        >
          <Save className="h-4 w-4" />
          {isSavingDraft ? "Saving..." : "Save"}
        </AixiaButton>
        <AixiaButton
          type="button"
          variant="secondary"
          onClick={() => {
            setEditingOverview(false);
            void loadProforma(true);
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
          onClick={() => void handleSaveDraftChanges()}
        >
          <Save className="h-4 w-4" />
          {isSavingDraft ? "Saving..." : "Save"}
        </AixiaButton>
        <AixiaButton
          type="button"
          variant="secondary"
          onClick={() => {
            setEditingFinancialSettings(false);
            void loadProforma(true);
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
          onClick={() => void handleSaveDraftChanges()}
        >
          <Save className="h-4 w-4" />
          {isSavingDraft ? "Saving..." : "Save"}
        </AixiaButton>
        <AixiaButton
          type="button"
          variant="secondary"
          onClick={() => {
            setEditingDocumentDetails(false);
            void loadProforma(true);
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
        Edit Terms
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
          onClick={() => void handleSaveDraftChanges()}
        >
          <Save className="h-4 w-4" />
          {isSavingDraft ? "Saving..." : "Save"}
        </AixiaButton>
      ) : null}
      {editingLines ? (
        <AixiaButton type="button" variant="secondary" onClick={addDraftLineItem}>
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
        description="Source mode, Customer PO source, client, company, dates, currency, and project context."
        icon={FileText}
        actions={overviewActions}
      >
        <AixiaFormGrid columns="three">
          <AixiaFormField>
            <AixiaDisplayBlock label="Source Mode" value={linkedCustomerPo ? "From Customer PO" : "Manual"} />
            {editingOverview && canEditDraft ? (
              <AixiaSelectField
                value={sourceModeDraft}
                onChange={(event) => {
                  const nextMode = event.target.value as "manual" | "customer_po";
                  setSourceModeDraft(nextMode);

                  if (nextMode === "manual") {
                    setSourceCustomerPoIdDraft("");
                    setLinkedCustomerPo(null);
                    setLineItemsDraft([createEditableDraftLineItem()]);
                    setNotesDraft("");
                  }
                }}
              >
                <option value="manual">Manual</option>
                <option value="customer_po">From Customer PO</option>
              </AixiaSelectField>
            ) : null}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Source Customer PO" />
            {editingOverview && canEditDraft ? (
              <AixiaSelectField
                value={sourceCustomerPoIdDraft}
                onChange={(event) => void applyCustomerPoSourceToDraft(event.target.value)}
              >
                <option value="">No Customer PO / Manual</option>
                {selectableCustomerPos.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.client_po_number || "Customer PO"} · {po.external_po_number || "No external no."} · {formatFinanceMoney(po.total_amount, po.currency_code || printableCurrencyCode)}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Source Customer PO"
                value={
                  linkedCustomerPo?.client_po_number ||
                  linkedCustomerPo?.external_po_number ||
                  getMetadataString(proforma.metadata, "client_po_number") ||
                  getMetadataString(proforma.metadata, "external_po_number") ||
                  "—"
                }
              />
            )}
          </AixiaFormField>

          <AixiaDisplayBlock label="Proforma Status" value={<AixiaStatusBadge value={proforma.status} />} />

          <AixiaFormField>
            <AixiaFieldLabel label="Client" />
            {editingOverview && canEditDraft ? (
              <AixiaSelectField value={clientIdDraft} onChange={(event) => setClientIdDraft(event.target.value)}>
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.legal_name || client.name}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Client"
                value={
                  selectedDraftClient?.legal_name ||
                  selectedDraftClient?.name ||
                  getMetadataString(proforma.metadata, "client_name_snapshot") ||
                  "—"
                }
              />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Issuing Company" />
            {editingOverview && canEditDraft ? (
              <AixiaSelectField value={companyIdDraft} onChange={(event) => setCompanyIdDraft(event.target.value)}>
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
                value={
                  selectedDraftCompany?.legal_name ||
                  selectedDraftCompany?.name ||
                  getMetadataString(proforma.metadata, "company_name_snapshot") ||
                  "—"
                }
              />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Currency" />
            {editingOverview && canEditDraft ? (
              <AixiaSelectField value={currencyIdDraft} onChange={(event) => setCurrencyIdDraft(event.target.value)}>
                <option value="">Select currency</option>
                {currencies.map((currency) => (
                  <option key={currency.id} value={currency.id}>
                    {currency.currency_code} — {currency.currency_name}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock label="Currency" value={printableCurrencyCode} />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Issue Date" />
            {editingOverview && canEditDraft ? (
              <AixiaInputField type="date" value={issueDateDraft} onChange={(event) => setIssueDateDraft(event.target.value)} />
            ) : (
              <AixiaDisplayBlock label="Issue Date" value={formatFinanceDate(proforma.issue_date)} />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Valid Until" />
            {editingOverview && canEditDraft ? (
              <AixiaInputField type="date" value={validUntilDraft} onChange={(event) => setValidUntilDraft(event.target.value)} />
            ) : (
              <AixiaDisplayBlock label="Valid Until" value={formatFinanceDate(proforma.valid_until)} />
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
                {projects.map((projectItem) => (
                  <option key={projectItem.id} value={projectItem.id}>
                    {projectItem.name}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock label="Project" value={selectedDraftProject?.name || "—"} />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Task" />
            {editingOverview && canEditDraft ? (
              <AixiaSelectField value={taskIdDraft} onChange={(event) => setTaskIdDraft(event.target.value)}>
                <option value="">No task</option>
                {filteredDraftTasks.map((taskItem) => (
                  <option key={taskItem.id} value={taskItem.id}>
                    {taskItem.title}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock label="Task" value={selectedDraftTask?.title || "—"} />
            )}
          </AixiaFormField>

          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Notes" />
            {editingOverview && canEditDraft ? (
              <AixiaTextareaField value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} rows={4} />
            ) : (
              <AixiaDisplayBlock label="Notes" value={proforma.notes || "—"} />
            )}
          </AixiaFormFullWidth>
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Financial Settings"
        description="Payment terms, shipping terms, bank account, payment method, and bank details."
        icon={CheckCircle}
        actions={financialActions}
      >
        <AixiaFormGrid columns="two">
          <AixiaFormField>
            <AixiaFieldLabel label="Payment Terms" />
            {editingFinancialSettings && canEditDraft ? (
              <AixiaSelectField value={paymentTermsIdDraft} onChange={(event) => setPaymentTermsIdDraft(event.target.value)}>
                <option value="">Select payment terms</option>
                {paymentTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.code} | {term.name}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Payment Terms"
                value={
                  getPaymentTermLabel(selectedDraftPaymentTerm) !== "—"
                    ? getPaymentTermLabel(selectedDraftPaymentTerm)
                    : proforma.payment_terms_snapshot || "—"
                }
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
                    {term.code} | {term.name}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Shipping Terms"
                value={selectedDraftShippingTermsLabel !== "—" ? selectedDraftShippingTermsLabel : proforma.shipping_terms_snapshot || "—"}
              />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Bank Account" />
            {editingFinancialSettings && canEditDraft ? (
              <AixiaSelectField value={bankAccountIdDraft} onChange={(event) => setBankAccountIdDraft(event.target.value)}>
                <option value="">Select bank account</option>
                {filteredDraftBankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Bank Account"
                value={selectedDraftBankAccount?.name || getMetadataString(proforma.metadata, "bank_account_name") || "—"}
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
                    {method.name}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Preferred Payment Method"
                value={selectedDraftPaymentMethod?.name || getMetadataString(proforma.metadata, "preferred_payment_method_name") || "—"}
              />
            )}
          </AixiaFormField>

          <AixiaFormFullWidth>
            <AixiaDisplayBlock
              label="Bank Details"
              value={
                (resolvedBankDetailsLines.length > 0
                  ? resolvedBankDetailsLines
                  : buildBankDetailsLinesFromSnapshot(
                      proforma.bank_details_snapshot || getMetadataString(proforma.metadata, "bank_details_snapshot"),
                    )
                ).join("\n") || "—"
              }
            />
          </AixiaFormFullWidth>
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Document Details"
        description="Document snapshots for print, parties, payment, shipping, notes, and terms."
        icon={FileText}
        actions={documentActions}
      >
        <AixiaReviewGrid variant="cards">
          <AixiaValueBlock
            label="Issuing Company"
            value={
              selectedDraftCompany?.legal_name ||
              selectedDraftCompany?.name ||
              getMetadataString(proforma.metadata, "company_name_snapshot") ||
              "—"
            }
            detail={
              [
                selectedDraftCompany?.contact_person || getMetadataString(proforma.metadata, "company_contact_person_snapshot"),
                selectedDraftCompany?.email || getMetadataString(proforma.metadata, "company_email_snapshot"),
                selectedDraftCompany?.phone || getMetadataString(proforma.metadata, "company_phone_snapshot"),
                resolvedDraftCompanyAddress || getMetadataString(proforma.metadata, "company_address_snapshot"),
              ]
                .filter(Boolean)
                .join(" • ") || "—"
            }
          />
          <AixiaValueBlock
            label="Recipient"
            value={
              selectedDraftClient?.legal_name ||
              selectedDraftClient?.name ||
              getMetadataString(proforma.metadata, "client_name_snapshot") ||
              "—"
            }
            detail={
              [
                selectedDraftClient?.contact_person || getMetadataString(proforma.metadata, "client_contact_person_snapshot"),
                selectedDraftClient?.company_email || selectedDraftClient?.personnel_email || getMetadataString(proforma.metadata, "client_email_snapshot"),
                selectedDraftClient?.company_phone || selectedDraftClient?.personnel_phone || getMetadataString(proforma.metadata, "client_phone_snapshot"),
                resolvedDraftRecipientAddress || getMetadataString(proforma.metadata, "billing_address_snapshot"),
              ]
                .filter(Boolean)
                .join(" • ") || "—"
            }
          />
          <AixiaValueBlock
            label="Payment Terms"
            value={getPaymentTermLabel(selectedDraftPaymentTerm) !== "—" ? getPaymentTermLabel(selectedDraftPaymentTerm) : proforma.payment_terms_snapshot || "—"}
          />
          <AixiaValueBlock
            label="Shipping Terms"
            value={selectedDraftShippingTermsLabel !== "—" ? selectedDraftShippingTermsLabel : proforma.shipping_terms_snapshot || "—"}
          />
          <AixiaValueBlock label="Currency" value={printableCurrencyCode} />
          <AixiaValueBlock
            label="Project / Task"
            value={[selectedDraftProject?.name, selectedDraftTask?.title].filter(Boolean).join(" / ") || "—"}
          />
        </AixiaReviewGrid>

        <AixiaFormFullWidth>
          <AixiaFieldLabel label="Terms & Conditions" />
          {editingDocumentDetails && canEditDraft ? (
            <AixiaTextareaField
              value={termsAndConditionsDraft}
              onChange={(event) => setTermsAndConditionsDraft(event.target.value)}
              rows={7}
            />
          ) : (
            <AixiaDisplayBlock
              label="Terms & Conditions"
              value={
                termsAndConditionsDraft ||
                proforma.terms_and_conditions_snapshot ||
                getMetadataString(proforma.metadata, "terms_and_conditions_snapshot") ||
                getMetadataString(proforma.metadata, "terms_and_conditions") ||
                getMetadataString(proforma.metadata, "document_terms_and_conditions") ||
                "—"
              }
            />
          )}
        </AixiaFormFullWidth>
      </AixiaSection>

      <AixiaSection
        title="Line Items"
        description="Products and services included in this proforma invoice."
        icon={SquarePen}
        badge={<AixiaBadge tone="cyan">{(editingLines ? lineItemsDraft : lineItems).length} Lines</AixiaBadge>}
        actions={lineActions}
        smartScroll
        itemCount={(editingLines ? lineItemsDraft : lineItems).length}
        visibleCards={10}
      >
        <div className="aixia-stack">
          {(editingLines ? lineItemsDraft : lineItems).map((row, index) => {
            const editable = editingLines && canEditDraft;
            const rowQuantity = toNumber(row.quantity);
            const rowUnitPrice = toNumber(row.unit_price);
            const rowDiscount = toNumber(row.discount);
            const rowTaxRate = taxCodes.find((taxCode) => taxCode.id === row.tax_code_id)?.rate_percent ?? 0;
            const taxableBase = Math.max(rowQuantity * rowUnitPrice - rowDiscount, 0);
            const rowTotal = editable
              ? taxableBase + taxableBase * (toNumber(rowTaxRate) / 100)
              : toNumber((row as ProformaLineItemRow).line_total);

            return (
              <AixiaFormRowCard
                key={row.id}
                title={`Line ${index + 1}`}
                description={editable ? "Editable draft line" : row.description || "Line item"}
                onRemove={editable ? () => removeDraftLineItem(row.id) : undefined}
                removeLabel={<Trash2 className="h-4 w-4" />}
              >
                <AixiaFormGrid columns="three">
                  <AixiaFormField>
                    <AixiaFieldLabel label="Item" />
                    {editable ? (
                      <AixiaSelectField value={row.item_id || ""} onChange={(event) => applyDraftItemSelection(row.id, event.target.value)}>
                        <option value="">Select item</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaDisplayBlock
                        label="Item"
                        value={getLineItemDisplayName(row as ProformaLineItemRow, items)}
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Description" />
                    {editable ? (
                      <AixiaInputField
                        value={row.description || ""}
                        onChange={(event) =>
                          setLineItemsDraft((current) =>
                            current.map((entry) =>
                              entry.id === row.id ? { ...entry, description: event.target.value } : entry,
                            ),
                          )
                        }
                      />
                    ) : (
                      <AixiaDisplayBlock label="Description" value={row.description || "—"} />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Quantity" />
                    {editable ? (
                      <AixiaInputField
                        value={String(row.quantity ?? "")}
                        onChange={(event) =>
                          setLineItemsDraft((current) =>
                            current.map((entry) =>
                              entry.id === row.id ? { ...entry, quantity: event.target.value } : entry,
                            ),
                          )
                        }
                      />
                    ) : (
                      <AixiaDisplayBlock label="Quantity" value={toNumber(row.quantity)} />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Unit" />
                    {editable ? (
                      <AixiaSelectField
                        value={row.unit_of_measure_id || ""}
                        onChange={(event) =>
                          setLineItemsDraft((current) =>
                            current.map((entry) =>
                              entry.id === row.id ? { ...entry, unit_of_measure_id: event.target.value } : entry,
                            ),
                          )
                        }
                      >
                        <option value="">Select unit</option>
                        {unitsOfMeasure.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name}
                          </option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaDisplayBlock
                        label="Unit"
                        value={getLineUnitDisplayName(
                          row as ProformaLineItemRow,
                          unitsOfMeasure,
                        )}
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Unit Price" />
                    {editable ? (
                      <AixiaInputField
                        value={String(row.unit_price ?? "")}
                        onChange={(event) =>
                          setLineItemsDraft((current) =>
                            current.map((entry) =>
                              entry.id === row.id ? { ...entry, unit_price: event.target.value } : entry,
                            ),
                          )
                        }
                      />
                    ) : (
                      <AixiaDisplayBlock label="Unit Price" value={formatFinanceMoney(row.unit_price, printableCurrencyCode)} />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Discount" />
                    {editable ? (
                      <AixiaInputField
                        value={String(row.discount ?? "")}
                        onChange={(event) =>
                          setLineItemsDraft((current) =>
                            current.map((entry) =>
                              entry.id === row.id ? { ...entry, discount: event.target.value } : entry,
                            ),
                          )
                        }
                      />
                    ) : (
                      <AixiaDisplayBlock label="Discount" value={formatFinanceMoney(row.discount, printableCurrencyCode)} />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Tax Code" />
                    {editable ? (
                      <AixiaSelectField
                        value={row.tax_code_id || ""}
                        onChange={(event) =>
                          setLineItemsDraft((current) =>
                            current.map((entry) =>
                              entry.id === row.id ? { ...entry, tax_code_id: event.target.value } : entry,
                            ),
                          )
                        }
                      >
                        <option value="">Select tax</option>
                        {taxCodes.map((taxCode) => (
                          <option key={taxCode.id} value={taxCode.id}>
                            {taxCode.name}
                          </option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaDisplayBlock
                        label="Tax Code"
                        value={getLineTaxDisplayName(row as ProformaLineItemRow, taxCodes)}
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Revenue Category" />
                    {editable ? (
                      <AixiaSelectField
                        value={row.revenue_category_id || ""}
                        onChange={(event) =>
                          setLineItemsDraft((current) =>
                            current.map((entry) =>
                              entry.id === row.id ? { ...entry, revenue_category_id: event.target.value } : entry,
                            ),
                          )
                        }
                      >
                        <option value="">Select category</option>
                        {revenueCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaDisplayBlock
                        label="Revenue Category"
                        value={getLineRevenueCategoryDisplayName(
                          row as ProformaLineItemRow,
                          revenueCategories,
                        )}
                      />
                    )}
                  </AixiaFormField>

                  <AixiaDisplayBlock label="Line Total" value={formatFinanceMoney(rowTotal, printableCurrencyCode)} />
                </AixiaFormGrid>
              </AixiaFormRowCard>
            );
          })}
        </div>
      </AixiaSection>
    </>
  );

  const lifecycleActionsContent = (
    <AixiaSection
      title="Lifecycle Actions"
      description="Print, issue, confirm, convert, archive, or delete this proforma invoice."
      icon={CheckCircle}
    >
        <div className="aixia-action-stack">
          <AixiaButton type="button" variant="secondary" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </AixiaButton>

          {canMarkIssued ? (
            <AixiaButton type="button" variant="primary" onClick={() => void handleMarkIssued()} disabled={isSavingDraft}>
              <CheckCircle className="h-4 w-4" />
              {isSavingDraft ? "Updating..." : "Mark as Issued"}
            </AixiaButton>
          ) : null}

          {canConfirm ? (
            <AixiaButton type="button" variant="primary" onClick={() => void handleConfirm()} disabled={isSavingDraft}>
              <CheckCircle className="h-4 w-4" />
              {isSavingDraft ? "Updating..." : "Mark as Confirmed"}
            </AixiaButton>
          ) : null}

          {canConvert ? (
            <AixiaButton type="button" variant="primary" onClick={() => void handleConvert()} disabled={isConverting}>
              <CheckCircle className="h-4 w-4" />
              {isConverting ? "Converting..." : "Convert to Invoice"}
            </AixiaButton>
          ) : null}

          {canArchive ? (
            <AixiaButton type="button" variant="danger" onClick={() => void handleArchive()} disabled={isArchiving}>
              <Archive className="h-4 w-4" />
              {isArchiving ? "Archiving..." : "Archive"}
            </AixiaButton>
          ) : null}

          {proforma.status !== "deleted" && proforma.status !== "converted" ? (
            <AixiaButton type="button" variant="danger" onClick={() => void handleDelete()} disabled={isDeleting}>
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </AixiaButton>
          ) : null}

          <AixiaButton
            type="button"
            variant="danger"
            onClick={() => {
              setShowArchivePopup(true);
              setArchiveTab("archived");
              void loadArchiveItems();
            }}
          >
            <Archive className="h-4 w-4" />
            Open Archive
          </AixiaButton>
        </div>
    </AixiaSection>
  );

  const sideContent = (
    <>
      <AixiaSection
        title="Financial Summary"
        description="Live totals and document currency view."
        icon={CheckCircle}
      >
        <AixiaReviewGrid variant="cards">
          <AixiaValueBlock label="Subtotal" value={formatFinanceMoney(financialSummary?.subtotal ?? 0, printableCurrencyCode)} />
          <AixiaValueBlock label="Discount" value={formatFinanceMoney(financialSummary?.discount ?? 0, printableCurrencyCode)} />
          <AixiaValueBlock label="Tax" value={formatFinanceMoney(financialSummary?.tax ?? 0, printableCurrencyCode)} />
          <AixiaValueBlock label="Total" value={formatFinanceMoney(financialSummary?.total ?? 0, printableCurrencyCode)} />
        </AixiaReviewGrid>
      </AixiaSection>

      <AixiaSection
        title="Linked Documents"
        description="Source Customer PO, converted invoice, and confirmed payments."
        icon={Link2}
      >
        <div className="aixia-stack">
          <AixiaActionCard
            label="Source Customer PO"
            value={
              linkedCustomerPo?.client_po_number ||
              linkedCustomerPo?.external_po_number ||
              getMetadataString(proforma.metadata, "client_po_number") ||
              getMetadataString(proforma.metadata, "external_po_number") ||
              "Manual"
            }
            description={
              linkedCustomerPo
                ? `${linkedCustomerPo.status} · ${formatFinanceMoney(
                    linkedCustomerPo.total_amount ?? getMetadataNumberOrString(proforma.metadata, "customer_po_total_amount"),
                    linkedCustomerPo.currency_code || printableCurrencyCode,
                  )}`
                : "This proforma invoice has no Customer PO source."
            }
            icon={Link2}
            tone="emerald"
            actionLabel={linkedCustomerPo ? "Open Customer PO" : undefined}
            onClick={
              linkedCustomerPo
                ? () => navigate(`/finance/transactions/customer-pos/${linkedCustomerPo.id}`)
                : undefined
            }
          />

          <AixiaActionCard
            label="Linked Invoice"
            value={linkedInvoice?.invoice_number || "—"}
            description={
              linkedInvoice
                ? `${linkedInvoice.status} · ${linkedInvoice.payment_status || "—"}`
                : "No invoice created from this proforma yet."
            }
            icon={FileText}
            tone="violet"
            actionLabel={linkedInvoice ? "Open Linked Invoice" : undefined}
            onClick={
              linkedInvoice
                ? () => navigate(`/finance/transactions/invoices/${linkedInvoice.id}`)
                : undefined
            }
          />
        </div>

        <AixiaReviewGrid variant="cards">
          <AixiaValueBlock
            label="Payment Progress"
            value={`${Math.round(paymentProgressPercent)}%`}
            detail={`${formatFinanceMoney(toNumber(proforma.paid_amount), printableCurrencyCode)} paid · ${formatFinanceMoney(toNumber(proforma.balance_due), printableCurrencyCode)} remaining`}
          />
          <AixiaValueBlock
            label="Payments Received"
            value={payments.length}
            detail="Confirmed payments linked to this proforma invoice."
          />
        </AixiaReviewGrid>

        {payments.length === 0 ? (
          <AixiaEmptyState
            icon={FileText}
            title="No payments yet"
            description="Confirmed payments linked to this proforma invoice will appear here."
          />
        ) : (
          <AixiaTableShell variant="default" minWidthClassName="min-w-[680px]">
            <thead className="aixia-table-head">
              <tr>
                <th>Payment</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="aixia-table-row">
                  <AixiaTableTextCell
                    width="md"
                    primary={payment.reference_number || payment.id}
                    secondary={formatFinanceDate(payment.payment_date)}
                  />
                  <AixiaTableTextCell
                    width="sm"
                    primary={formatFinanceMoney(
                      toNumber(payment.amount),
                      payment.payment_currency_code || printableCurrencyCode
                    )}
                    secondary={payment.invoice_currency_code}
                  />
                  <AixiaTableBadgeCell width="sm">
                    <AixiaStatusBadge value={payment.status} />
                  </AixiaTableBadgeCell>
                  <AixiaTableActionsCell>
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={() =>
                        navigate(`/finance/transactions/payments-received/${payment.id}`)
                      }
                    >
                      Open
                    </AixiaButton>
                  </AixiaTableActionsCell>
                </tr>
              ))}
            </tbody>
          </AixiaTableShell>
        )}
      </AixiaSection>
    </>
  );

  return (
    <>
      <AixiaPage>
        <AixiaHero
          parentLabel="Proforma / Invoice"
          parentPath="/finance/transactions/invoices"
          badges={[
            { label: "Proforma Invoice", tone: "violet" },
            { label: getProformaStatusLabel(proforma.status), tone: proforma.status === "confirmed" ? "emerald" : "neutral" },
            ...(linkedCustomerPo ? [{ label: "Source Customer PO", tone: "emerald" as const }] : []),
            ...(linkedInvoice ? [{ label: "Linked Invoice", tone: "violet" as const }] : []),
          ]}
          gradientTitle="Proforma"
          title={proforma.proforma_number || (proforma.status === "draft" ? "Draft Proforma" : "Proforma Invoice")}
          description="Commercial pre-invoice document used before formal invoice issuance. Drafts are editable. Confirmed proformas can be converted into invoices."
          statusCards={[
            {
              label: "Recipient",
              value:
                selectedDraftClient?.legal_name ||
                selectedDraftClient?.name ||
                getMetadataString(proforma.metadata, "client_name_snapshot") ||
                "—",
              description: "Client selected for this proforma invoice.",
              icon: CheckCircle,
              tone: "cyan",
            },
            {
              label: "Balance Due",
              value: formatFinanceMoney(financialSummary?.balance ?? 0, printableCurrencyCode),
              description: "Remaining amount after confirmed payments.",
              icon: WalletCards,
              tone: "amber",
            },
            {
              label: "Payment Progress",
              value: `${Math.round(paymentProgressPercent)}%`,
              description: "Confirmed payments against proforma total.",
              icon: CreditCard,
              tone: "emerald",
            },
          ]}
          actions={
            canRecordPayment ? (
              <AixiaButton
                type="button"
                variant="primary"
                onClick={() =>
                  navigate(
                    `/finance/transactions/payments-received/new?proforma_invoice_id=${proforma.id}&document_type=proforma`
                  )
                }
              >
                <CheckCircle className="h-4 w-4" />
                Record Payment
              </AixiaButton>
            ) : undefined
          }
        />

        <AixiaMetricGrid>
          <AixiaMetricCard
            label="Subtotal"
            value={formatFinanceMoney(financialSummary?.subtotal ?? 0, printableCurrencyCode)}
            description="Before discount and tax."
            icon={FileText}
            tone="cyan"
          />
          <AixiaMetricCard
            label="Discount"
            value={formatFinanceMoney(financialSummary?.discount ?? 0, printableCurrencyCode)}
            description="Commercial discount."
            icon={CheckCircle}
            tone="amber"
          />
          <AixiaMetricCard
            label="Tax"
            value={formatFinanceMoney(financialSummary?.tax ?? 0, printableCurrencyCode)}
            description="Based on selected tax codes."
            icon={FileText}
            tone="violet"
          />
          <AixiaMetricCard
            label="Total"
            value={formatFinanceMoney(financialSummary?.total ?? 0, printableCurrencyCode)}
            description="Proforma value."
            icon={CheckCircle}
            tone="emerald"
          />
        </AixiaMetricGrid>

        <AixiaAccessRule
          title="Locked access rule"
          description="Proforma invoice detail access follows the shared Finance document, lifecycle, registry, archive, and print standards."
          icon={FileText}
        >
          This page uses shared AiXia components for page shell, hero, metrics, sections, forms, line-item rows, lifecycle actions, archive modal, and table actions. Page-local UI primitives and local Tailwind visual systems are intentionally removed.
        </AixiaAccessRule>

        {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}

        <AixiaSmartLayout
          sidebar="normal"
          balance="main"
          matchColumns={false}
          bottomSpan="auto"
          sideRebalance="off"
          mainTopCount={2}
          top={lifecycleActionsContent}
          main={mainContent}
          side={sideContent}
        />

        <AixiaArchiveManagerModal
          open={showArchivePopup}
          title="Proforma Invoice Archive"
          description="Archived proforma invoices can be restored. Deleted proforma invoices can be restored or permanently deleted."
          archivedCount={archivedArchiveCount}
          deletedCount={deletedArchiveCount}
          activeTab={archiveTab}
          onTabChange={setArchiveTab}
          onClose={() => setShowArchivePopup(false)}
          maxWidthClassName="max-w-[1300px]"
        >
          {visibleArchiveItems.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title={`No ${archiveTab} proforma invoices`}
              description={`No ${archiveTab} proforma invoice records are available.`}
            />
          ) : (
            <AixiaTableShell variant="archive" minWidthClassName="min-w-[980px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Proforma</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleArchiveItems.map((item) => (
                  <tr key={item.id} className="aixia-table-row">
                    <AixiaTableTextCell primary={item.proforma_number || "Proforma Invoice"} width="lg" />
                    <AixiaTableBadgeCell>
                      <AixiaStatusBadge value={item.status} />
                    </AixiaTableBadgeCell>
                    <AixiaTableTextCell primary={formatFinanceMoney(item.total_amount, printableCurrencyCode)} width="md" />
                    <AixiaTableDateCell>{formatFinanceDate(item.updated_at || null)}</AixiaTableDateCell>
                    <AixiaTableActionsCell>
                      <AixiaButton type="button" variant="secondary" onClick={() => void handleRestore(item.id)} disabled={isSavingDraft}>
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </AixiaButton>
                      {archiveTab === "deleted" ? (
                        <AixiaButton type="button" variant="danger" onClick={() => void handleHardDelete(item.id)} disabled={isDeleting}>
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

      <ProformaInvoicePrintDocument
        proforma={printableProforma}
        lineItems={lineItems}
        financialSummary={financialSummary}
      />
    </>
  );
}
