"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle,
  FileText,
  Link2,
  Printer,
  RotateCcw,
  Save,
  SquarePen,
  Trash2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  description: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  discount: number | string | null;
  tax_code_id: string | null;
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

function getProformaStatusBadgeClasses(status: ProformaStatus) {
  switch (status) {
    case "draft":
      return "border-white/10 bg-white/10 text-white/75";
    case "issued":
      return "border-sky-400/20 bg-sky-500/10 text-sky-200";
    case "confirmed":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "converted":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "archived":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "deleted":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    case "canceled":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    default:
      return "border-white/10 bg-white/10 text-white/75";
  }
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
        const [proformaRecord, proformaLines, invoiceResult] =
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
          ]);

        if (invoiceResult.error) {
          throw invoiceResult.error;
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

  const financialSummary = useMemo(() => {
    if (!proforma || !totals) return null;

    if (canEditDraft) {
      return {
        subtotal: draftTotals.subtotal,
        discount: draftTotals.discount,
        tax: draftTotals.tax,
        total: draftTotals.total,
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
      await softDeleteProformaInvoice(id);

      setEditingOverview(false);
      setEditingFinancialSettings(false);
      setEditingDocumentDetails(false);
      setEditingLines(false);

      await loadProforma(true);
      await loadArchiveItems();
      setShowArchivePopup(true);
    } catch (err) {
      console.error(err);
      setError("Failed to delete proforma invoice.");
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
        await permanentlyDeleteProformaInvoice(proformaId);

        if (proformaId === id) {
          navigate("/finance/transactions/proforma-invoices");
          return;
        }

        await loadArchiveItems();
      } catch (err) {
        console.error(err);
        setError("Failed to permanently delete archived proforma invoice.");
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
      if (current.length === 1) {
        return current;
      }

      return current.filter((entry) => entry.id !== lineId);
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
            id: row.id,
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

  const sectionCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";

  const innerPanelClass =
    "rounded-[24px] border border-white/10 bg-black/20 p-4";

  const fieldShellClass =
    "h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30";

  const inputFieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";

  const readOnlyFieldClass =
    "flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm leading-6 text-white/80";

  const labelClass = "text-sm font-medium text-slate-300";

  const eyebrowClass = "text-[11px] uppercase tracking-[0.2em] text-slate-500";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Loading proforma invoice...
          </div>
        </div>
      </div>
    );
  }

  if (!proforma || !totals) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Proforma invoice not found.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  navigate("/finance/transactions/proforma-invoices")
                }
                className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Proforma Invoices
              </button>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_620px]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                      Proforma Workspace
                    </Badge>

                    <Badge
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${getProformaStatusBadgeClasses(
                        proforma.status
                      )}`}
                    >
                      {getProformaStatusLabel(proforma.status)}
                    </Badge>

                    {linkedCustomerPo ? (
                      <Badge className="inline-flex w-fit rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                        Source Customer PO
                      </Badge>
                    ) : null}

                    {linkedInvoice ? (
                      <Badge className="inline-flex w-fit rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200 shadow-none">
                        Linked Invoice
                      </Badge>
                    ) : null}
                  </div>

                  <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                    {proforma.proforma_number ||
                      (proforma.status === "draft"
                        ? "Draft Proforma"
                        : "Proforma Invoice")}
                  </h1>

                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                    Commercial pre-invoice document used before formal invoice
                    issuance. Drafts are editable. Confirmed proformas can be
                    converted into invoices.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                      Draft → Issued → Confirmed
                    </span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                      Customer PO source editable in draft
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
                          Recipient
                        </p>
                        <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                          {selectedDraftClient?.legal_name ||
                            selectedDraftClient?.name ||
                            getMetadataString(
                              proforma.metadata,
                              "client_name_snapshot"
                            ) ||
                            "—"}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Client selected for this proforma invoice.
                    </p>
                  </div>

                  <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Total
                        </p>
                        <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                          {formatFinanceMoney(
                            financialSummary?.total ?? 0,
                            printableCurrencyCode
                          )}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Current proforma commercial value.
                    </p>
                  </div>
                </div>
              </div>

                            <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="h-11 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>

                {canMarkIssued ? (
                  <Button
                    onClick={() => void handleMarkIssued()}
                    disabled={isSavingDraft}
                    className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isSavingDraft ? "Updating..." : "Mark as Issued"}
                  </Button>
                ) : null}

                {canConfirm ? (
                  <Button
                    onClick={() => void handleConfirm()}
                    disabled={isSavingDraft}
                    className="h-11 rounded-2xl border border-emerald-400/20 bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isSavingDraft ? "Updating..." : "Mark as Confirmed"}
                  </Button>
                ) : null}

                {canConvert ? (
                  <Button
                    onClick={() => void handleConvert()}
                    disabled={isConverting}
                    className="h-11 rounded-2xl border border-violet-400/20 bg-violet-500 px-4 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isConverting ? "Converting..." : "Convert to Invoice"}
                  </Button>
                ) : null}

                {canArchive ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleArchive()}
                    disabled={isArchiving}
                    className="h-11 rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    {isArchiving ? "Archiving..." : "Archive"}
                  </Button>
                ) : null}

                {proforma.status !== "deleted" &&
                proforma.status !== "converted" ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleDelete()}
                    disabled={isDeleting}
                    className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
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
                      {formatFinanceMoney(
                        financialSummary?.subtotal ?? 0,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  </div>
                </div>
                <div className="text-sm leading-6 text-slate-400">
                  Before discount and tax.
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
                      {formatFinanceMoney(
                        financialSummary?.discount ?? 0,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                  </div>
                </div>
                <div className="text-sm leading-6 text-slate-400">
                  Commercial discount.
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
                      {formatFinanceMoney(
                        financialSummary?.tax ?? 0,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                    <span className="h-2 w-2 rounded-full bg-violet-400" />
                  </div>
                </div>
                <div className="text-sm leading-6 text-slate-400">
                  Based on selected tax codes.
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
                      {formatFinanceMoney(
                        financialSummary?.total ?? 0,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  </div>
                </div>
                <div className="text-sm leading-6 text-slate-400">
                  Proforma value.
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
                        Source mode, source Customer PO, client, company, dates, currency, and project context.
                      </CardDescription>
                    </div>
                  </div>

                  {canEditDraft ? (
                    <div className="flex items-center gap-2">
                      {editingOverview ? (
                        <>
                          <Button
                            onClick={() => void handleSaveDraftChanges()}
                            disabled={isSavingDraft}
                            className="h-9 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-3 font-semibold text-slate-950 hover:bg-cyan-400"
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {isSavingDraft ? "Saving..." : "Save"}
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingOverview(false);
                              void loadProforma(true);
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
                    <div className={eyebrowClass}>Source Mode</div>
                    {editingOverview && canEditDraft ? (
                      <>
                        <select
                          value={sourceModeDraft}
                          onChange={(event) => {
                            const nextMode = event.target.value as
                              | "manual"
                              | "customer_po";

                            setSourceModeDraft(nextMode);

                            if (nextMode === "manual") {
                              setSourceCustomerPoIdDraft("");
                              setLinkedCustomerPo(null);
                              setLineItemsDraft([createEditableDraftLineItem()]);
                              setNotesDraft("");
                            }
                          }}
                          className={`mt-2 ${fieldShellClass}`}
                        >
                          <option value="manual">Manual</option>
                          <option value="customer_po">From Customer PO</option>
                        </select>

                        {sourceModeDraft === "customer_po" ? (
                          <select
                            value={sourceCustomerPoIdDraft}
                            onChange={(event) =>
                              void applyCustomerPoSourceToDraft(
                                event.target.value
                              )
                            }
                            className={`mt-2 ${fieldShellClass}`}
                          >
                            <option value="">Select Customer PO</option>
                            {selectableCustomerPos.map((po) => (
                              <option key={po.id} value={po.id}>
                                {po.client_po_number || "Customer PO"} ·{" "}
                                {po.external_po_number || "No external no."} ·{" "}
                                {formatFinanceMoney(
                                  po.total_amount,
                                  po.currency_code || printableCurrencyCode
                                )}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </>
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {linkedCustomerPo ? "From Customer PO" : "Manual"}
                      </div>
                    )}
                  </div>

                  <div className={innerPanelClass}>
                    <div className={eyebrowClass}>Source Customer PO</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {linkedCustomerPo?.client_po_number ||
                        linkedCustomerPo?.external_po_number ||
                        getMetadataString(proforma.metadata, "client_po_number") ||
                        getMetadataString(proforma.metadata, "external_po_number") ||
                        "—"}
                    </div>
                  </div>

                  <div className={innerPanelClass}>
                    <div className={eyebrowClass}>Proforma Status</div>
                    <div className="mt-2">
                      <Badge
                        className={`rounded-full border px-3 py-1 text-xs shadow-none ${getProformaStatusBadgeClasses(
                          proforma.status
                        )}`}
                      >
                        {getProformaStatusLabel(proforma.status)}
                      </Badge>
                    </div>
                  </div>

                  <div className={innerPanelClass}>
                    <div className={eyebrowClass}>Client</div>
                    {editingOverview && canEditDraft ? (
                      <select
                        value={clientIdDraft}
                        onChange={(event) => setClientIdDraft(event.target.value)}
                        className={`mt-2 ${fieldShellClass}`}
                      >
                        <option value="">Select client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.legal_name || client.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {selectedDraftClient?.legal_name ||
                          selectedDraftClient?.name ||
                          getMetadataString(proforma.metadata, "client_name_snapshot") ||
                          "—"}
                      </div>
                    )}
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
                        {selectedDraftCompany?.legal_name ||
                          selectedDraftCompany?.name ||
                          getMetadataString(
                            proforma.metadata,
                            "company_name_snapshot"
                          ) ||
                          "—"}
                      </div>
                    )}
                  </div>

                  <div className={innerPanelClass}>
                    <div className={eyebrowClass}>Currency</div>
                    {editingOverview && canEditDraft ? (
                      <select
                        value={currencyIdDraft}
                        onChange={(event) => setCurrencyIdDraft(event.target.value)}
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
                        {printableCurrencyCode}
                      </div>
                    )}
                  </div>

                  <div className={innerPanelClass}>
                    <div className={eyebrowClass}>Issue Date</div>
                    {editingOverview && canEditDraft ? (
                      <input
                        type="date"
                        value={issueDateDraft}
                        onChange={(event) => setIssueDateDraft(event.target.value)}
                        className={`mt-2 ${fieldShellClass}`}
                      />
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {formatFinanceDate(proforma.issue_date)}
                      </div>
                    )}
                  </div>

                  <div className={innerPanelClass}>
                    <div className={eyebrowClass}>Valid Until</div>
                    {editingOverview && canEditDraft ? (
                      <input
                        type="date"
                        value={validUntilDraft}
                        onChange={(event) => setValidUntilDraft(event.target.value)}
                        className={`mt-2 ${fieldShellClass}`}
                      />
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {formatFinanceDate(proforma.valid_until)}
                      </div>
                    )}
                  </div>

                  <div className={innerPanelClass}>
                    <div className={eyebrowClass}>Linked Customer PO</div>
                    {editingOverview && canEditDraft ? (
                      <select
                        value={sourceCustomerPoIdDraft}
                        onChange={(event) =>
                          void applyCustomerPoSourceToDraft(event.target.value)
                        }
                        className={`mt-2 ${fieldShellClass}`}
                      >
                        <option value="">No Customer PO / Manual</option>
                        {selectableCustomerPos.map((po) => (
                          <option key={po.id} value={po.id}>
                            {po.client_po_number || "Customer PO"} ·{" "}
                            {po.external_po_number || "No external no."} ·{" "}
                            {formatFinanceMoney(
                              po.total_amount,
                              po.currency_code || printableCurrencyCode
                            )}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {linkedCustomerPo?.client_po_number ||
                          linkedCustomerPo?.external_po_number ||
                          getMetadataString(proforma.metadata, "client_po_number") ||
                          getMetadataString(proforma.metadata, "external_po_number") ||
                          "—"}
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
                        {projects.map((projectItem) => (
                          <option key={projectItem.id} value={projectItem.id}>
                            {projectItem.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {selectedDraftProject?.name || "—"}
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
                        {filteredDraftTasks.map((taskItem) => (
                          <option key={taskItem.id} value={taskItem.id}>
                            {taskItem.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {selectedDraftTask?.title || "—"}
                      </div>
                    )}
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
                        {proforma.notes || "—"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={sectionCardClass}>
                <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-emerald-200">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Financial Settings
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Payment terms, shipping terms, bank account, and payment method.
                      </CardDescription>
                    </div>
                  </div>

                  {canEditDraft ? (
                    <div className="flex items-center gap-2">
                      {editingFinancialSettings ? (
                        <>
                          <Button
                            onClick={() => void handleSaveDraftChanges()}
                            disabled={isSavingDraft}
                            className="h-9 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-3 font-semibold text-slate-950 hover:bg-cyan-400"
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {isSavingDraft ? "Saving..." : "Save"}
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingFinancialSettings(false);
                              void loadProforma(true);
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
                            {term.code} | {term.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {getPaymentTermLabel(selectedDraftPaymentTerm) !== "—"
                          ? getPaymentTermLabel(selectedDraftPaymentTerm)
                          : proforma.payment_terms_snapshot || "—"}
                      </div>
                    )}
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
                            {term.code} | {term.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {selectedDraftShippingTermsLabel !== "—"
                          ? selectedDraftShippingTermsLabel
                          : proforma.shipping_terms_snapshot || "—"}
                      </div>
                    )}
                  </div>

                  <div className={innerPanelClass}>
                    <div className={eyebrowClass}>Bank Account</div>
                    {editingFinancialSettings && canEditDraft ? (
                      <select
                        value={bankAccountIdDraft}
                        onChange={(event) =>
                          setBankAccountIdDraft(event.target.value)
                        }
                        className={`mt-2 ${fieldShellClass}`}
                      >
                        <option value="">Select bank account</option>
                        {filteredDraftBankAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {selectedDraftBankAccount?.name ||
                          getMetadataString(proforma.metadata, "bank_account_name") ||
                          "—"}
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
                            {method.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {selectedDraftPaymentMethod?.name ||
                          getMetadataString(
                            proforma.metadata,
                            "preferred_payment_method_name"
                          ) ||
                          "—"}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-2">
                    <div className={eyebrowClass}>Bank Details</div>
                    <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">
                      {(resolvedBankDetailsLines.length > 0
                        ? resolvedBankDetailsLines
                        : buildBankDetailsLinesFromSnapshot(
                            proforma.bank_details_snapshot ||
                              getMetadataString(
                                proforma.metadata,
                                "bank_details_snapshot"
                              )
                          )
                      ).join("\n") || "—"}
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
                        Document snapshots for print, parties, payment, shipping, notes, and terms.
                      </CardDescription>
                    </div>
                  </div>

                  {canEditDraft ? (
                    <div className="flex items-center gap-2">
                      {editingDocumentDetails ? (
                        <>
                          <Button
                            onClick={() => void handleSaveDraftChanges()}
                            disabled={isSavingDraft}
                            className="h-9 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-3 font-semibold text-slate-950 hover:bg-cyan-400"
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {isSavingDraft ? "Saving..." : "Save"}
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingDocumentDetails(false);
                              void loadProforma(true);
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
                          Edit Terms
                        </Button>
                      )}
                    </div>
                  ) : null}
                </CardHeader>

                <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                  <div className={innerPanelClass}>
                    <div className={eyebrowClass}>Issuing Company</div>
                    <div className="mt-3 text-xl font-semibold leading-tight text-white">
                      {selectedDraftCompany?.legal_name ||
                        selectedDraftCompany?.name ||
                        getMetadataString(proforma.metadata, "company_name_snapshot") ||
                        "—"}
                    </div>
                    <div className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                      <div>
                        {selectedDraftCompany?.contact_person ||
                          getMetadataString(
                            proforma.metadata,
                            "company_contact_person_snapshot"
                          ) ||
                          "—"}
                      </div>
                      <div>
                        {selectedDraftCompany?.email ||
                          getMetadataString(
                            proforma.metadata,
                            "company_email_snapshot"
                          ) ||
                          "—"}
                      </div>
                      <div>
                        {selectedDraftCompany?.phone ||
                          getMetadataString(
                            proforma.metadata,
                            "company_phone_snapshot"
                          ) ||
                          "—"}
                      </div>
                      <div>
                        {resolvedDraftCompanyAddress ||
                          getMetadataString(
                            proforma.metadata,
                            "company_address_snapshot"
                          ) ||
                          "—"}
                      </div>
                    </div>
                  </div>

                  <div className={innerPanelClass}>
                    <div className={eyebrowClass}>Recipient</div>
                    <div className="mt-3 text-xl font-semibold leading-tight text-white">
                      {selectedDraftClient?.legal_name ||
                        selectedDraftClient?.name ||
                        getMetadataString(proforma.metadata, "client_name_snapshot") ||
                        "—"}
                    </div>
                    <div className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                      <div>
                        {selectedDraftClient?.contact_person ||
                          getMetadataString(
                            proforma.metadata,
                            "client_contact_person_snapshot"
                          ) ||
                          "—"}
                      </div>
                      <div>
                        {selectedDraftClient?.company_email ||
                          selectedDraftClient?.personnel_email ||
                          getMetadataString(
                            proforma.metadata,
                            "client_email_snapshot"
                          ) ||
                          "—"}
                      </div>
                      <div>
                        {selectedDraftClient?.company_phone ||
                          selectedDraftClient?.personnel_phone ||
                          getMetadataString(
                            proforma.metadata,
                            "client_phone_snapshot"
                          ) ||
                          "—"}
                      </div>
                      <div>
                        {resolvedDraftRecipientAddress ||
                          getMetadataString(
                            proforma.metadata,
                            "billing_address_snapshot"
                          ) ||
                          "—"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-2">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <div>
                        <div className={eyebrowClass}>Payment Terms</div>
                        <div className="mt-2 text-sm font-semibold text-white">
                          {getPaymentTermLabel(selectedDraftPaymentTerm) !== "—"
                            ? getPaymentTermLabel(selectedDraftPaymentTerm)
                            : proforma.payment_terms_snapshot || "—"}
                        </div>
                      </div>

                      <div>
                        <div className={eyebrowClass}>Shipping Terms</div>
                        <div className="mt-2 text-sm font-semibold text-white">
                          {selectedDraftShippingTermsLabel !== "—"
                            ? selectedDraftShippingTermsLabel
                            : proforma.shipping_terms_snapshot || "—"}
                        </div>
                      </div>

                      <div>
                        <div className={eyebrowClass}>Currency</div>
                        <div className="mt-2 text-sm font-semibold text-white">
                          {printableCurrencyCode}
                        </div>
                      </div>

                      <div>
                        <div className={eyebrowClass}>Project / Task</div>
                        <div className="mt-2 text-sm font-semibold text-white">
                          {[selectedDraftProject?.name, selectedDraftTask?.title]
                            .filter(Boolean)
                            .join(" / ") || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-2">
                    <div className={eyebrowClass}>Terms &amp; Conditions</div>
                    {editingDocumentDetails && canEditDraft ? (
                      <textarea
                        value={termsAndConditionsDraft}
                        onChange={(event) =>
                          setTermsAndConditionsDraft(event.target.value)
                        }
                        rows={7}
                        className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                      />
                    ) : (
                      <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">
                        {termsAndConditionsDraft ||
                          proforma.terms_and_conditions_snapshot ||
                          getMetadataString(
                            proforma.metadata,
                            "terms_and_conditions_snapshot"
                          ) ||
                          "—"}
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
                        Products and services included in this proforma invoice.
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingLines ? (
                      <Button
                        onClick={() => void handleSaveDraftChanges()}
                        disabled={isSavingDraft}
                        className="h-9 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
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
                    const editable = editingLines && canEditDraft;
                    const rowQuantity = toNumber(row.quantity);
                    const rowUnitPrice = toNumber(row.unit_price);
                    const rowDiscount = toNumber(row.discount);
                    const rowTaxRate =
                      taxCodes.find((taxCode) => taxCode.id === row.tax_code_id)
                        ?.rate_percent ?? 0;
                    const taxableBase = Math.max(
                      rowQuantity * rowUnitPrice - rowDiscount,
                      0
                    );
                    const rowTotal = editable
                      ? taxableBase + taxableBase * (toNumber(rowTaxRate) / 100)
                      : toNumber((row as ProformaLineItemRow).line_total);

                    return (
                      <div
                        key={row.id}
                        className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                      >
                        <div className="mb-4 flex items-center justify-between gap-4">
                          <div className="text-sm font-semibold text-white">
                            Line {index + 1}
                          </div>

                          {editable ? (
                            <Button
                              variant="outline"
                              onClick={() => removeDraftLineItem(row.id)}
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
                                value={row.item_id || ""}
                                onChange={(event) =>
                                  applyDraftItemSelection(
                                    row.id,
                                    event.target.value
                                  )
                                }
                                className={inputFieldClass}
                              >
                                <option value="">Select item</option>
                                {items.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className={readOnlyFieldClass}>
                                {items.find((item) => item.id === row.item_id)
                                  ?.name || "—"}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-4">
                            <div className={labelClass}>Description</div>
                            {editable ? (
                              <input
                                value={row.description || ""}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === row.id
                                        ? {
                                            ...entry,
                                            description: event.target.value,
                                          }
                                        : entry
                                    )
                                  )
                                }
                                className={inputFieldClass}
                              />
                            ) : (
                              <div className={readOnlyFieldClass}>
                                {row.description || "—"}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-1">
                            <div className={labelClass}>Qty</div>
                            {editable ? (
                              <input
                                value={String(row.quantity ?? "")}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === row.id
                                        ? {
                                            ...entry,
                                            quantity: event.target.value,
                                          }
                                        : entry
                                    )
                                  )
                                }
                                className={inputFieldClass}
                              />
                            ) : (
                              <div className={readOnlyFieldClass}>
                                {toNumber(row.quantity)}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <div className={labelClass}>Unit</div>
                            {editable ? (
                              <select
                                value={row.unit_of_measure_id || ""}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === row.id
                                        ? {
                                            ...entry,
                                            unit_of_measure_id: event.target.value,
                                          }
                                        : entry
                                    )
                                  )
                                }
                                className={inputFieldClass}
                              >
                                <option value="">Select unit</option>
                                {unitsOfMeasure.map((unit) => (
                                  <option key={unit.id} value={unit.id}>
                                    {unit.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className={readOnlyFieldClass}>
                                {unitsOfMeasure.find(
                                  (unit) => unit.id === row.unit_of_measure_id
                                )?.name || "—"}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <div className={labelClass}>Unit Price</div>
                            {editable ? (
                              <input
                                value={String(row.unit_price ?? "")}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === row.id
                                        ? {
                                            ...entry,
                                            unit_price: event.target.value,
                                          }
                                        : entry
                                    )
                                  )
                                }
                                className={inputFieldClass}
                              />
                            ) : (
                              <div className={readOnlyFieldClass}>
                                {formatFinanceMoney(
                                  row.unit_price,
                                  printableCurrencyCode
                                )}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <div className={labelClass}>Discount</div>
                            {editable ? (
                              <input
                                value={String(row.discount ?? "")}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === row.id
                                        ? {
                                            ...entry,
                                            discount: event.target.value,
                                          }
                                        : entry
                                    )
                                  )
                                }
                                className={inputFieldClass}
                              />
                            ) : (
                              <div className={readOnlyFieldClass}>
                                {formatFinanceMoney(
                                  row.discount,
                                  printableCurrencyCode
                                )}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <div className={labelClass}>Tax Code</div>
                            {editable ? (
                              <select
                                value={row.tax_code_id || ""}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === row.id
                                        ? {
                                            ...entry,
                                            tax_code_id: event.target.value,
                                          }
                                        : entry
                                    )
                                  )
                                }
                                className={inputFieldClass}
                              >
                                <option value="">Select tax</option>
                                {taxCodes.map((taxCode) => (
                                  <option key={taxCode.id} value={taxCode.id}>
                                    {taxCode.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className={readOnlyFieldClass}>
                                {taxCodes.find(
                                  (taxCode) => taxCode.id === row.tax_code_id
                                )?.name || "—"}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-3">
                            <div className={labelClass}>Revenue Category</div>
                            {editable ? (
                              <select
                                value={row.revenue_category_id || ""}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === row.id
                                        ? {
                                            ...entry,
                                            revenue_category_id:
                                              event.target.value,
                                          }
                                        : entry
                                    )
                                  )
                                }
                                className={inputFieldClass}
                              >
                                <option value="">Select category</option>
                                {revenueCategories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className={readOnlyFieldClass}>
                                {revenueCategories.find(
                                  (category) =>
                                    category.id === row.revenue_category_id
                                )?.name || "—"}
                              </div>
                            )}
                          </label>

                          <div className="space-y-2 md:col-span-3">
                            <div className={labelClass}>Line Total</div>
                            <div className="flex min-h-[44px] items-center rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100">
                              {formatFinanceMoney(
                                rowTotal,
                                printableCurrencyCode
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                    Live totals and document currency view.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  <div className={innerPanelClass}>
                    <div className={eyebrowClass}>Subtotal</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.subtotal ?? 0,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className={innerPanelClass}>
                    <div className={eyebrowClass}>Discount</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.discount ?? 0,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className={innerPanelClass}>
                    <div className={eyebrowClass}>Tax</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.tax ?? 0,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/80">
                      Total
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.total ?? 0,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={sectionCardClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Linked Documents
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-slate-500">
                    Source Customer PO and converted invoice relationship.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  <div className={innerPanelClass}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={eyebrowClass}>Source Customer PO</div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {linkedCustomerPo?.client_po_number ||
                            linkedCustomerPo?.external_po_number ||
                            getMetadataString(
                              proforma.metadata,
                              "client_po_number"
                            ) ||
                            getMetadataString(
                              proforma.metadata,
                              "external_po_number"
                            ) ||
                            "Manual"}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">
                          {linkedCustomerPo
                            ? `${linkedCustomerPo.status} · ${formatFinanceMoney(
                                linkedCustomerPo.total_amount ??
                                  getMetadataNumberOrString(
                                    proforma.metadata,
                                    "customer_po_total_amount"
                                  ),
                                linkedCustomerPo.currency_code ||
                                  printableCurrencyCode
                              )}`
                            : "This proforma invoice has no Customer PO source."}
                        </div>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                        <Link2 className="h-4 w-4" />
                      </div>
                    </div>

                    {linkedCustomerPo ? (
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/finance/transactions/customer-pos/${linkedCustomerPo.id}`
                          )
                        }
                        className="mt-4 h-9 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-3 text-emerald-200 hover:bg-emerald-500/20"
                      >
                        Open Customer PO
                      </Button>
                    ) : null}
                  </div>

                  <div className={innerPanelClass}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={eyebrowClass}>Linked Invoice</div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {linkedInvoice?.invoice_number || "—"}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">
                          {linkedInvoice
                            ? `${linkedInvoice.status} · ${linkedInvoice.payment_status || "—"}`
                            : "No invoice created from this proforma yet."}
                        </div>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                        <FileText className="h-4 w-4" />
                      </div>
                    </div>

                    {linkedInvoice ? (
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/finance/transactions/invoices/${linkedInvoice.id}`
                          )
                        }
                        className="mt-4 h-9 rounded-2xl border-violet-400/20 bg-violet-500/10 px-3 text-violet-200 hover:bg-violet-500/20"
                      >
                        Open Linked Invoice
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card className={sectionCardClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Archive
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Soft-delete, archive, restore, and hard-delete controls.
                      </CardDescription>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowArchivePopup((current) => {
                          const next = !current;

                          if (next) {
                            setArchiveTab("archived");
                            void loadArchiveItems();
                          }

                          return next;
                        });
                      }}
                      className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                    >
                      {showArchivePopup ? "Close" : "Open Archive"}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-6 text-slate-400">
                    Archive moves the proforma invoice to archived. Delete moves
                    the proforma invoice to deleted. Hard delete is available only
                    from the deleted tab.
                  </div>

                  {showArchivePopup ? (
                    <div className="space-y-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setArchiveTab("archived")}
                          className={`rounded-xl px-4 py-2 text-sm transition ${
                            archiveTab === "archived"
                              ? "bg-white/10 text-white"
                              : "text-slate-500 hover:bg-white/[0.05] hover:text-white"
                          }`}
                        >
                          Archived
                        </button>

                        <button
                          type="button"
                          onClick={() => setArchiveTab("deleted")}
                          className={`rounded-xl px-4 py-2 text-sm transition ${
                            archiveTab === "deleted"
                              ? "bg-rose-500/15 text-rose-200"
                              : "text-slate-500 hover:bg-white/[0.05] hover:text-white"
                          }`}
                        >
                          Deleted
                        </button>
                      </div>

                      {visibleArchiveItems.length === 0 ? (
                        <div className="text-sm text-slate-500">
                          No {archiveTab} proforma invoices.
                        </div>
                      ) : (
                        <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
                          {visibleArchiveItems.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="text-sm font-medium text-white">
                                    {item.proforma_number || "Proforma Invoice"}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {formatFinanceDate(item.updated_at || null)}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="text-sm text-slate-400">
                                    {formatFinanceMoney(
                                      item.total_amount,
                                      printableCurrencyCode
                                    )}
                                  </div>

                                  <Button
                                    variant="outline"
                                    onClick={() => void handleRestore(item.id)}
                                    disabled={isSavingDraft}
                                    className="h-9 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-3 text-emerald-200 hover:bg-emerald-500/20"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>

                                  {archiveTab === "deleted" ? (
                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        void handleHardDelete(item.id)
                                      }
                                      disabled={isDeleting}
                                      className="h-9 rounded-2xl border-rose-400/20 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {error ? (
                <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <ProformaInvoicePrintDocument
        proforma={printableProforma}
        lineItems={lineItems}
        financialSummary={financialSummary}
      />
    </>
  );
}
