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
  Receipt,
  RotateCcw,
  Save,
  SquarePen,
  Trash2,
  WalletCards,
} from "lucide-react";

import {
  AixiaActionCard,
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaButton,
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
  AixiaTableShell,
  AixiaTableTextCell,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";
import {
  formatFinanceDate,
  formatFinanceMoney,
  getInvoiceDisplayState,
  getIssuedInvoiceById,
  getIssuedInvoicePaymentStatusLabel,
  getIssuedInvoiceStatusLabel,
  type InvoicePostingStatus,
} from "@/lib/finance/invoicesIssued";
import { supabase } from "@/lib/supabase";
import InvoicePrintDocument from "./InvoicePrintDocument";

type InvoiceRecord = {
  id: string;
  invoice_number: string;
  status:
    | "draft"
    | "issued"
    | "partially_paid"
    | "paid"
    | "deleted"
    | "archived";
  payment_status: "unpaid" | "partial" | "paid";
  counterparty_type: "client" | "company";
  counterparty_company_id: string | null;
  counterparty_name_snapshot: string | null;
  counterparty_legal_name_snapshot: string | null;
  counterparty_contact_person_snapshot: string | null;
  counterparty_email_snapshot: string | null;
  counterparty_phone_snapshot: string | null;
  client_id: string;
  client_name_snapshot: string | null;
  client_contact_person_snapshot: string | null;
  billing_address_snapshot: string | null;
  client_email_snapshot: string | null;
  client_phone_snapshot: string | null;
  company_id: string | null;
  company_name_snapshot: string | null;
  company_contact_person_snapshot: string | null;
  company_address_snapshot: string | null;
  company_email_snapshot: string | null;
  company_phone_snapshot: string | null;
  payment_terms_id: string | null;
  payment_terms_snapshot: string | null;
  shipping_term_id: string | null;
  shipping_terms_snapshot: string | null;
  terms_and_conditions_snapshot: string | null;
  bank_account_id: string | null;
  bank_details_snapshot: string | null;
  currency_id: string | null;
  issue_date: string;
  due_date: string;
  currency_code: string | null;
  project_id: string | null;
  task_id: string | null;
  notes: string | null;
  subtotal: number | string | null;
  discount_amount: number | string | null;
  tax_amount: number | string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  issued_at: string | null;
  paid_at: string | null;
  canceled_at: string | null;
  voided_at: string | null;
  posted_to_ledger: boolean;
  metadata?: Record<string, unknown> | null;
};

type LineItemRow = {
  id: string;
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

type ProformaInvoiceLinkRow = {
  id: string;
  proforma_number: string | null;
  status: string;
  total_amount: number | string | null;
  currency_code: string | null;
  client_po_id: string | null;
  quotation_id: string | null;
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

type ArchiveInvoiceRow = {
  id: string;
  invoice_number: string;
  status: "archived" | "deleted";
  counterparty_name_snapshot: string | null;
  client_name_snapshot: string | null;
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

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
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

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
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

function buildClientAddress(client: ClientOption | null) {
  if (!client) return "";

  return [
    client.address_line_1,
    client.address_line_2,
    client.city,
    client.state_province,
    client.postal_code,
    client.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildBankIdentifierLine(account: BankAccountOption | null) {
  if (!account) return "";

  if (account.iban) return `IBAN: ${account.iban}`;
  if (account.swift_code) return `SWIFT: ${account.swift_code}`;

  if (account.account_identifier_value) {
    const normalizedType = (account.account_identifier_type || "").toLowerCase();
    return `${normalizedType === "swift" ? "SWIFT" : "Identifier"}: ${
      account.account_identifier_value
    }`;
  }

  return "";
}

function buildBankAddressFromAccount(account: BankAccountOption | null) {
  if (!account) return "";
  if (account.bank_address) return account.bank_address;

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

function buildBankDetailsLinesFromAccount(account: BankAccountOption | null) {
  if (!account) return [];

  const resolvedBankName = account.bank_name || account.institution_name || "";
  const resolvedAccountNumber = account.account_number || account.masked_account_number || "";
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

function getPostingStatusLabel(status: InvoicePostingStatus) {
  return status === "posted" ? "Posted" : "Not posted";
}

function getInvoiceLineItemDisplayName(
  row: LineItemRow | EditableLineItem,
  items: ItemOption[],
) {
  const selectedItem = items.find((item) => item.id === row.item_id);

  return selectedItem?.name || row.description || "—";
}

function getInvoiceLineUnitDisplayName(
  row: LineItemRow | EditableLineItem,
  unitsOfMeasure: UnitOfMeasureOption[],
) {
  const selectedUnit = unitsOfMeasure.find(
    (unit) => unit.id === row.unit_of_measure_id,
  );

  if (!selectedUnit) return "—";

  return selectedUnit.code ? `${selectedUnit.name} — ${selectedUnit.code}` : selectedUnit.name;
}

function getInvoiceLineTaxDisplayName(
  row: LineItemRow | EditableLineItem,
  taxCodes: TaxCodeOption[],
) {
  const selectedTaxCode = taxCodes.find((taxCode) => taxCode.id === row.tax_code_id);

  if (!selectedTaxCode) return "—";

  return selectedTaxCode.code
    ? `${selectedTaxCode.name} — ${selectedTaxCode.code}`
    : `${selectedTaxCode.name} — ${toNumber(selectedTaxCode.rate_percent).toFixed(2)}%`;
}

function getInvoiceLineRevenueCategoryDisplayName(
  row: LineItemRow | EditableLineItem,
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

export default function FinanceInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [, setIsRefreshing] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [linkedProformaInvoice, setLinkedProformaInvoice] =
    useState<ProformaInvoiceLinkRow | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [task, setTask] = useState<TaskRow | null>(null);
  const [archiveItems, setArchiveItems] = useState<ArchiveInvoiceRow[]>([]);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermOption[]>([]);
  const [shippingTerms, setShippingTerms] = useState<ShippingTermOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([]);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasureOption[]>([]);
  const [revenueCategories, setRevenueCategories] = useState<RevenueCategoryOption[]>([]);

  const [showArchivePopup, setShowArchivePopup] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">("archived");

  const [editingOverview, setEditingOverview] = useState(false);
  const [editingFinancialSettings, setEditingFinancialSettings] = useState(false);
  const [editingDocumentDetails, setEditingDocumentDetails] = useState(false);
  const [editingLines, setEditingLines] = useState(false);

  const [issueDateDraft, setIssueDateDraft] = useState("");
  const [dueDateDraft, setDueDateDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");

  const [clientIdDraft, setClientIdDraft] = useState("");
  const [companyIdDraft, setCompanyIdDraft] = useState("");
  const [projectIdDraft, setProjectIdDraft] = useState("");
  const [taskIdDraft, setTaskIdDraft] = useState("");
  const [paymentTermsIdDraft, setPaymentTermsIdDraft] = useState("");
  const [shippingTermIdDraft, setShippingTermIdDraft] = useState("");
  const [bankAccountIdDraft, setBankAccountIdDraft] = useState("");
  const [currencyIdDraft, setCurrencyIdDraft] = useState("");
  const [paymentMethodIdDraft, setPaymentMethodIdDraft] = useState("");
  const [termsAndConditionsDraft, setTermsAndConditionsDraft] = useState("");
  const [lineItemsDraft, setLineItemsDraft] = useState<EditableLineItem[]>([]);
  const [error, setError] = useState("");

  const handlePrint = useCallback(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  }, []);

  const closeAllEditors = useCallback(() => {
    setEditingOverview(false);
    setEditingFinancialSettings(false);
    setEditingDocumentDetails(false);
    setEditingLines(false);
  }, []);

  const loadArchiveItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("finance_invoices_issued")
      .select(
        "id, invoice_number, status, counterparty_name_snapshot, client_name_snapshot, total_amount, updated_at"
      )
      .in("status", ["archived", "deleted"])
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to load archived invoices:", error);
      return;
    }

    setArchiveItems((data || []) as ArchiveInvoiceRow[]);
  }, []);

  const loadInvoice = useCallback(
    async (refreshOnly = false) => {
      if (!id) return;

      if (refreshOnly) setIsRefreshing(true);
      else setIsLoading(true);

      setError("");

      try {
        const [{ invoice, lineItems }, paymentsResult, projectResult] =
          await Promise.all([
            getIssuedInvoiceById(id),
            supabase
              .from("finance_payments_received")
              .select(
                "id, amount, converted_amount, payment_currency_code, invoice_currency_code, payment_date, status, reference_number"
              )
              .eq("invoice_id", id)
              .eq("status", "confirmed")
              .order("payment_date", { ascending: false }),
            supabase
              .from("finance_invoices_issued")
              .select("project:projects(id, name), task:tasks(id, title)")
              .eq("id", id)
              .maybeSingle(),
            loadArchiveItems(),
          ]);

        if (paymentsResult.error) throw paymentsResult.error;
        if (projectResult.error) console.warn("Failed to load linked project/task:", projectResult.error);

        const typedInvoice = invoice as unknown as InvoiceRecord & {
          proforma_invoice_id?: string | null;
        };
        const typedLineItems = (lineItems || []) as unknown as LineItemRow[];
        const typedPayments = (paymentsResult.data || []) as PaymentRow[];
        const linkedProject = (projectResult.data as any)?.project ?? null;
        const linkedTask = (projectResult.data as any)?.task ?? null;
        const resolvedProformaInvoiceId =
          typedInvoice.proforma_invoice_id ||
          (typedInvoice.metadata?.proforma_invoice_id as string | undefined) ||
          "";

        let linkedProformaRow: ProformaInvoiceLinkRow | null = null;

        if (resolvedProformaInvoiceId) {
          const { data: proformaData, error: proformaError } = await supabase
            .from("finance_proforma_invoices")
            .select(
              "id, proforma_number, status, total_amount, currency_code, client_po_id, quotation_id"
            )
            .eq("id", resolvedProformaInvoiceId)
            .maybeSingle();

          if (proformaError) console.warn("Failed to load linked proforma invoice:", proformaError);
          linkedProformaRow = (proformaData || null) as ProformaInvoiceLinkRow | null;
        }

        setInvoice(typedInvoice);
        setLineItems(typedLineItems);
        setPayments(typedPayments);
        setLinkedProformaInvoice(linkedProformaRow);
        setProject(linkedProject);
        setTask(linkedTask);
        setIssueDateDraft(typedInvoice.issue_date || "");
        setDueDateDraft(typedInvoice.due_date || "");
        setNotesDraft(typedInvoice.notes || "");
        setTermsAndConditionsDraft(typedInvoice.terms_and_conditions_snapshot || "");
        setClientIdDraft(
          typedInvoice.counterparty_type === "company"
            ? `company:${typedInvoice.counterparty_company_id || ""}`
            : typedInvoice.client_id
              ? `client:${typedInvoice.client_id}`
              : ""
        );
        setCompanyIdDraft(typedInvoice.company_id || "");
        setProjectIdDraft(typedInvoice.project_id || "");
        setTaskIdDraft(typedInvoice.task_id || "");
        setPaymentTermsIdDraft(typedInvoice.payment_terms_id || "");
        setShippingTermIdDraft(typedInvoice.shipping_term_id || "");
        setBankAccountIdDraft(typedInvoice.bank_account_id || "");
        setCurrencyIdDraft(typedInvoice.currency_id || "");
        setPaymentMethodIdDraft(
          (typedInvoice.metadata?.preferred_payment_method_id as string) || ""
        );
        setLineItemsDraft(
          typedLineItems.map((row) => ({
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
        );
      } catch (err) {
        console.error(err);
        setError("Failed to load invoice.");
      } finally {
        if (refreshOnly) setIsRefreshing(false);
        else setIsLoading(false);
      }
    },
    [id, loadArchiveItems]
  );

  const loadMasterData = useCallback(async () => {
    try {
      const [
        clientsResult,
        companiesResult,
        projectsResult,
        tasksResult,
        paymentTermsResult,
        shippingTermsResult,
        bankAccountsResult,
        currenciesResult,
        paymentMethodsResult,
        itemsResult,
        taxCodesResult,
        unitsOfMeasureResult,
        revenueCategoriesResult,
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
        supabase.from("projects").select("id, name").order("name", { ascending: true }),
        supabase.from("tasks").select("id, title, project_id").order("created_at", { ascending: false }),
        supabase
          .from("finance_payment_terms")
          .select("id, code, name, due_days, is_default, document_label, document_terms_text")
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
          .from("finance_currencies")
          .select("id, currency_code, currency_name")
          .eq("status", "active")
          .order("currency_code", { ascending: true }),
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
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (tasksResult.error) throw tasksResult.error;
      if (paymentTermsResult.error) throw paymentTermsResult.error;
      if (shippingTermsResult.error) throw shippingTermsResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (paymentMethodsResult.error) throw paymentMethodsResult.error;
      if (itemsResult.error) throw itemsResult.error;
      if (taxCodesResult.error) throw taxCodesResult.error;
      if (unitsOfMeasureResult.error) throw unitsOfMeasureResult.error;
      if (revenueCategoriesResult.error) throw revenueCategoriesResult.error;

      setClients((clientsResult.data || []) as ClientOption[]);
      setCompanies((companiesResult.data || []) as CompanyOption[]);
      setProjects((projectsResult.data || []) as ProjectRow[]);
      setTasks((tasksResult.data || []) as TaskRow[]);
      setPaymentTerms((paymentTermsResult.data || []) as PaymentTermOption[]);
      setShippingTerms((shippingTermsResult.data || []) as ShippingTermOption[]);
      setBankAccounts((bankAccountsResult.data || []) as BankAccountOption[]);
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
      setPaymentMethods((paymentMethodsResult.data || []) as PaymentMethodOption[]);
      setItems((itemsResult.data || []) as ItemOption[]);
      setTaxCodes((taxCodesResult.data || []) as TaxCodeOption[]);
      setUnitsOfMeasure((unitsOfMeasureResult.data || []) as UnitOfMeasureOption[]);
      setRevenueCategories((revenueCategoriesResult.data || []) as RevenueCategoryOption[]);
    } catch (err) {
      console.error("Failed to load invoice master data:", err);
    }
  }, []);

  useEffect(() => {
    void loadInvoice();
    void loadMasterData();
  }, [loadInvoice, loadMasterData]);

  const totals = useMemo(() => {
    if (!invoice) return null;

    return {
      subtotal: toNumber(invoice.subtotal),
      discount: toNumber(invoice.discount_amount),
      tax: toNumber(invoice.tax_amount),
      total: toNumber(invoice.total_amount),
      paid: toNumber(invoice.paid_amount),
      balance: toNumber(invoice.balance_due),
    };
  }, [invoice]);

  const selectedDraftClient = useMemo(() => {
    if (!clientIdDraft.startsWith("client:")) return null;
    const resolvedId = clientIdDraft.replace("client:", "");
    return clients.find((client) => client.id === resolvedId) ?? null;
  }, [clientIdDraft, clients]);

  const selectedDraftRecipientCompany = useMemo(() => {
    if (!clientIdDraft.startsWith("company:")) return null;
    const resolvedId = clientIdDraft.replace("company:", "");
    return companies.find((company) => company.id === resolvedId) ?? null;
  }, [clientIdDraft, companies]);

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

  const selectedDraftCurrency = useMemo(
    () => currencies.find((entry) => entry.id === currencyIdDraft) ?? null,
    [currencies, currencyIdDraft]
  );

  const selectedDraftPaymentMethod = useMemo(
    () => paymentMethods.find((entry) => entry.id === paymentMethodIdDraft) ?? null,
    [paymentMethodIdDraft, paymentMethods]
  );

  const filteredDraftTasks = useMemo(() => {
    if (!projectIdDraft) return tasks;
    return tasks.filter((task) => task.project_id === projectIdDraft);
  }, [projectIdDraft, tasks]);

  const filteredDraftBankAccounts = useMemo(() => {
    if (!companyIdDraft) return bankAccounts;
    return bankAccounts.filter(
      (account) => !account.company_id || account.company_id === companyIdDraft
    );
  }, [bankAccounts, companyIdDraft]);

  const selectedDraftBankAccount = useMemo(
    () => filteredDraftBankAccounts.find((account) => account.id === bankAccountIdDraft) ?? null,
    [bankAccountIdDraft, filteredDraftBankAccounts]
  );

  const resolvedDraftCompanyAddress = useMemo(
    () => buildCompanyAddress(selectedDraftCompany),
    [selectedDraftCompany]
  );

  const resolvedDraftRecipientName = useMemo(
    () =>
      selectedDraftClient?.legal_name ||
      selectedDraftClient?.name ||
      selectedDraftRecipientCompany?.legal_name ||
      selectedDraftRecipientCompany?.name ||
      "",
    [selectedDraftClient, selectedDraftRecipientCompany]
  );

  const resolvedDraftRecipientAddress = useMemo(() => {
    if (selectedDraftClient) return buildClientAddress(selectedDraftClient);
    return buildCompanyAddress(selectedDraftRecipientCompany);
  }, [selectedDraftClient, selectedDraftRecipientCompany]);

  const resolvedDraftRecipientEmail = useMemo(
    () =>
      selectedDraftClient?.company_email ||
      selectedDraftClient?.personnel_email ||
      selectedDraftRecipientCompany?.email ||
      "",
    [selectedDraftClient, selectedDraftRecipientCompany]
  );

  const resolvedDraftRecipientPhone = useMemo(
    () =>
      selectedDraftClient?.company_phone ||
      selectedDraftClient?.personnel_phone ||
      selectedDraftRecipientCompany?.phone ||
      "",
    [selectedDraftClient, selectedDraftRecipientCompany]
  );

  const resolvedDraftRecipientContact = useMemo(
    () => selectedDraftClient?.contact_person || selectedDraftRecipientCompany?.contact_person || "",
    [selectedDraftClient, selectedDraftRecipientCompany]
  );

  const resolvedIssuedRecipientName = useMemo(() => {
    if (!invoice) return "";
    return (
      invoice.counterparty_legal_name_snapshot ||
      invoice.counterparty_name_snapshot ||
      invoice.client_name_snapshot ||
      ""
    );
  }, [invoice]);

  const resolvedIssuedRecipientEmail = useMemo(() => {
    if (!invoice) return "";
    return invoice.client_email_snapshot || invoice.counterparty_email_snapshot || "";
  }, [invoice]);

  const resolvedIssuedRecipientPhone = useMemo(() => {
    if (!invoice) return "";
    return invoice.client_phone_snapshot || invoice.counterparty_phone_snapshot || "";
  }, [invoice]);

  const resolvedIssuedRecipientContact = useMemo(() => {
    if (!invoice) return "";
    return invoice.client_contact_person_snapshot || invoice.counterparty_contact_person_snapshot || "";
  }, [invoice]);

  const resolvedBankDetailsLines = useMemo(() => {
    if (!invoice) return [];
    if (invoice.status === "draft") return buildBankDetailsLinesFromAccount(selectedDraftBankAccount);
    return buildBankDetailsLinesFromSnapshot(invoice.bank_details_snapshot);
  }, [invoice, selectedDraftBankAccount]);

  const draftTotals = useMemo(() => {
    const subtotal = lineItemsDraft.reduce(
      (sum, row) => sum + toNumber(row.quantity) * toNumber(row.unit_price),
      0
    );
    const discount = lineItemsDraft.reduce((sum, row) => sum + toNumber(row.discount), 0);
    const tax = lineItemsDraft.reduce((sum, row) => {
      const qty = toNumber(row.quantity);
      const price = toNumber(row.unit_price);
      const rowDiscount = toNumber(row.discount);
      const base = Math.max(qty * price - rowDiscount, 0);
      const taxCode = taxCodes.find((t) => t.id === row.tax_code_id);
      if (!taxCode) return sum;
      return sum + base * (toNumber(taxCode.rate_percent) / 100);
    }, 0);
    const total = Math.max(subtotal - discount + tax, 0);

    return { subtotal, discount, tax, total };
  }, [lineItemsDraft, taxCodes]);

  const financialSummary = useMemo(() => {
    if (!invoice || !totals) return null;

    if (invoice.status === "draft") {
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
  }, [draftTotals, invoice, totals]);

  useEffect(() => {
    if (!invoice || invoice.status !== "draft" || !selectedDraftClient) return;

    if (selectedDraftClient.payment_terms_id && !paymentTermsIdDraft) {
      setPaymentTermsIdDraft(selectedDraftClient.payment_terms_id);
    }

    if (selectedDraftClient.currency_code && !currencyIdDraft) {
      const matchedCurrency = currencies.find(
        (currency) => currency.currency_code === selectedDraftClient.currency_code
      );
      if (matchedCurrency) setCurrencyIdDraft(matchedCurrency.id);
    }

    if (!dueDateDraft) {
      const days = selectedDraftClient.payment_terms_days ?? 14;
      const base = new Date(issueDateDraft || new Date().toISOString().slice(0, 10));
      base.setDate(base.getDate() + days);
      setDueDateDraft(base.toISOString().slice(0, 10));
    }
  }, [
    currencies,
    currencyIdDraft,
    dueDateDraft,
    invoice,
    issueDateDraft,
    paymentTermsIdDraft,
    selectedDraftClient,
  ]);

  useEffect(() => {
    if (!invoice || invoice.status !== "draft") return;

    setTermsAndConditionsDraft((current) => {
      const trimmed = current.trim();
      if (trimmed || current !== "") return current;

      return "Payment is due according to the agreed payment terms stated on this invoice. Goods remain subject to the agreed shipping terms. Any bank charges are the responsibility of the payer unless otherwise agreed in writing. Please reference the invoice number with your payment. Late payments may result in delays, additional charges, or suspension of further deliveries or services.";
    });
  }, [invoice]);

  useEffect(() => {
    if (!invoice || invoice.status !== "draft" || !companyIdDraft) return;

    const selectedBankStillBelongsToCompany =
      !bankAccountIdDraft ||
      filteredDraftBankAccounts.some((account) => account.id === bankAccountIdDraft);

    if (!selectedBankStillBelongsToCompany) setBankAccountIdDraft("");

    const defaultBank =
      filteredDraftBankAccounts.find((account) => account.is_default) ??
      filteredDraftBankAccounts[0];

    if (defaultBank && !bankAccountIdDraft) setBankAccountIdDraft(defaultBank.id);

    if (!currencyIdDraft && selectedDraftCompany?.currency_code) {
      const matchedCurrency = currencies.find(
        (currency) => currency.currency_code === selectedDraftCompany.currency_code
      );
      if (matchedCurrency) setCurrencyIdDraft(matchedCurrency.id);
    }
  }, [
    bankAccountIdDraft,
    companyIdDraft,
    currencies,
    currencyIdDraft,
    filteredDraftBankAccounts,
    invoice,
    selectedDraftCompany,
  ]);

  useEffect(() => {
    if (!invoice || invoice.status !== "draft") return;
    const taskStillValid = filteredDraftTasks.some((entry) => entry.id === taskIdDraft);
    if (taskIdDraft && !taskStillValid) setTaskIdDraft("");
  }, [filteredDraftTasks, invoice, taskIdDraft]);

  const canEditDraft = invoice?.status === "draft";
  const canEditIssuedOverview = invoice?.status === "issued";
  const canEditIssuedDetails = invoice?.status === "issued";
  const canRecordPayment =
    !!invoice &&
    ["issued", "partially_paid"].includes(invoice.status) &&
    toNumber(invoice.balance_due) > 0;
  const canArchive =
    !!invoice && ["draft", "issued", "partially_paid", "paid"].includes(invoice.status);

  const handleIssue = useCallback(async () => {
    if (!invoice || !id) return;

    setIsIssuing(true);
    setError("");

    try {
      if (!lineItemsDraft.length) {
        setError("Invoice must have at least one line item.");
        return;
      }

      if (!clientIdDraft) {
        setError("Invoice must have a recipient.");
        return;
      }

      if (!selectedDraftBankAccount) {
        setError("Bank account is required before issuing.");
        return;
      }

      const selectedPaymentMethod = paymentMethods.find((method) => method.id === paymentMethodIdDraft);
      const selectedCurrency = currencies.find((currency) => currency.id === currencyIdDraft);
      const selectedPaymentTerm = paymentTerms.find((term) => term.id === paymentTermsIdDraft);
      const selectedShippingTerm = shippingTerms.find((term) => term.id === shippingTermIdDraft);
      const isCompany = clientIdDraft.startsWith("company:");
      const isClient = clientIdDraft.startsWith("client:");
      const resolvedClientId = isClient ? clientIdDraft.replace("client:", "") : null;
      const resolvedCompanyId = isCompany ? clientIdDraft.replace("company:", "") : null;

      const { error: snapshotError } = await supabase
        .from("finance_invoices_issued")
        .update({
          client_id: resolvedClientId,
          counterparty_company_id: resolvedCompanyId,
          counterparty_type: isCompany ? "company" : "client",
          company_id: companyIdDraft || null,
          project_id: projectIdDraft || null,
          task_id: taskIdDraft || null,
          payment_terms_id: paymentTermsIdDraft || null,
          shipping_term_id: shippingTermIdDraft || null,
          bank_account_id: bankAccountIdDraft || null,
          currency_id: currencyIdDraft || null,
          currency_code: selectedCurrency?.currency_code || invoice.currency_code || "USD",
          issue_date: issueDateDraft,
          due_date: dueDateDraft,
          notes: notesDraft || null,
          company_name_snapshot: selectedDraftCompany?.legal_name || selectedDraftCompany?.name || null,
          company_contact_person_snapshot: selectedDraftCompany?.contact_person || null,
          company_address_snapshot: resolvedDraftCompanyAddress || null,
          company_email_snapshot: selectedDraftCompany?.email || null,
          company_phone_snapshot: selectedDraftCompany?.phone || null,
          counterparty_name_snapshot: resolvedDraftRecipientName || null,
          counterparty_legal_name_snapshot: resolvedDraftRecipientName || null,
          counterparty_contact_person_snapshot: resolvedDraftRecipientContact || null,
          counterparty_email_snapshot: resolvedDraftRecipientEmail || null,
          counterparty_phone_snapshot: resolvedDraftRecipientPhone || null,
          client_name_snapshot: selectedDraftClient?.legal_name || selectedDraftClient?.name || null,
          client_contact_person_snapshot: selectedDraftClient?.contact_person || null,
          client_email_snapshot:
            selectedDraftClient?.company_email || selectedDraftClient?.personnel_email || null,
          client_phone_snapshot:
            selectedDraftClient?.company_phone || selectedDraftClient?.personnel_phone || null,
          billing_address_snapshot: resolvedDraftRecipientAddress || null,
          payment_terms_snapshot:
            selectedPaymentTerm?.document_label || selectedPaymentTerm?.name || null,
          shipping_terms_snapshot: selectedShippingTerm?.description?.trim()
            ? `${selectedShippingTerm.name} — ${selectedShippingTerm.description.trim()}`
            : selectedShippingTerm?.name || selectedShippingTerm?.code || null,
          terms_and_conditions_snapshot: termsAndConditionsDraft || null,
          bank_details_snapshot: buildBankDetailsSnapshotFromAccount(selectedDraftBankAccount),
          metadata: {
            ...(invoice.metadata || {}),
            preferred_payment_method_id: paymentMethodIdDraft || null,
            preferred_payment_method_name: selectedPaymentMethod?.name || null,
            preferred_payment_method_code: selectedPaymentMethod?.code || null,
            bank_account_id: bankAccountIdDraft || null,
            bank_account_name: selectedDraftBankAccount?.name || null,
            bank_name:
              selectedDraftBankAccount?.bank_name ||
              selectedDraftBankAccount?.institution_name ||
              null,
            beneficiary_name: selectedDraftBankAccount?.beneficiary_name || null,
            bank_address_snapshot: buildBankAddressFromAccount(selectedDraftBankAccount) || null,
            iban: selectedDraftBankAccount?.iban || null,
            swift_code:
              selectedDraftBankAccount?.swift_code ||
              (selectedDraftBankAccount?.account_identifier_type?.toLowerCase() === "swift"
                ? selectedDraftBankAccount?.account_identifier_value
                : null),
            bank_identifier_type: selectedDraftBankAccount?.account_identifier_type || null,
            bank_identifier_value: selectedDraftBankAccount?.account_identifier_value || null,
            account_number:
              selectedDraftBankAccount?.account_number ||
              selectedDraftBankAccount?.masked_account_number ||
              null,
            bank_account_currency_code: selectedDraftBankAccount?.currency_code || null,
          },
        })
        .eq("id", id)
        .eq("status", "draft");

      if (snapshotError) throw snapshotError;

      const { error } = await supabase.rpc("finance_issue_invoice_issued", {
        p_invoice_id: id,
      });

      if (error) throw error;
      await loadInvoice(true);
    } catch (err) {
      console.error(err);
      setError("Failed to issue invoice.");
    } finally {
      setIsIssuing(false);
    }
  }, [
    bankAccountIdDraft,
    clientIdDraft,
    companyIdDraft,
    currencies,
    currencyIdDraft,
    dueDateDraft,
    id,
    invoice,
    issueDateDraft,
    lineItemsDraft,
    loadInvoice,
    notesDraft,
    paymentMethodIdDraft,
    paymentMethods,
    paymentTerms,
    paymentTermsIdDraft,
    projectIdDraft,
    resolvedDraftCompanyAddress,
    resolvedDraftRecipientAddress,
    resolvedDraftRecipientContact,
    resolvedDraftRecipientEmail,
    resolvedDraftRecipientName,
    resolvedDraftRecipientPhone,
    selectedDraftBankAccount,
    selectedDraftClient,
    selectedDraftCompany,
    shippingTermIdDraft,
    shippingTerms,
    taskIdDraft,
    termsAndConditionsDraft,
  ]);

  const handleArchive = useCallback(async () => {
    if (!invoice || !id) return;

    setIsArchiving(true);
    setError("");

    try {
      const { error } = await supabase.rpc("finance_archive_invoice_issued", {
        p_invoice_id: id,
      });
      if (error) throw error;
      closeAllEditors();
      await loadInvoice(true);
      await loadArchiveItems();
      setShowArchivePopup(true);
    } catch (err) {
      console.error(err);
      setError("Failed to move invoice to archive.");
    } finally {
      setIsArchiving(false);
    }
  }, [closeAllEditors, id, invoice, loadArchiveItems, loadInvoice]);

  const handleRestore = useCallback(
    async (invoiceId: string) => {
      setIsDeleting(true);
      setError("");

      try {
        const { error } = await supabase.rpc("finance_restore_invoice_issued", {
          p_invoice_id: invoiceId,
        });
        if (error) throw error;
        if (invoiceId === id) await loadInvoice(true);
        await loadArchiveItems();
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to restore invoice.");
      } finally {
        setIsDeleting(false);
      }
    },
    [id, loadArchiveItems, loadInvoice]
  );

  const handleHardDelete = useCallback(
    async (invoiceId: string) => {
      setIsDeleting(true);
      setError("");

      try {
        const { data: payments, error: paymentsError } = await supabase
          .from("finance_payments_received")
          .select("id")
          .eq("invoice_id", invoiceId)
          .eq("status", "confirmed");
        if (paymentsError) throw paymentsError;
        if (payments && payments.length > 0) throw new Error("Cannot delete invoice with existing payments.");

        const { error: invoiceError } = await supabase.rpc(
          "finance_hard_delete_invoice_issued",
          { p_invoice_id: invoiceId }
        );
        if (invoiceError) throw invoiceError;
        if (invoiceId === id) {
          navigate("/finance/transactions/invoices");
          return;
        }
        await loadArchiveItems();
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to permanently delete archived invoice.");
      } finally {
        setIsDeleting(false);
      }
    },
    [id, loadArchiveItems, navigate]
  );

  const handleDelete = useCallback(async () => {
    if (!invoice || !id) return;

    setIsDeleting(true);
    setError("");

    try {
      const { error } = await supabase.rpc("finance_delete_invoice_issued", {
        p_invoice_id: id,
      });
      if (error) throw error;
      await loadInvoice(true);
      await loadArchiveItems();
      setShowArchivePopup(true);
    } catch (err) {
      console.error(err);
      setError("Failed to delete invoice.");
    } finally {
      setIsDeleting(false);
    }
  }, [id, invoice, loadArchiveItems, loadInvoice]);

  const applyDraftItemSelection = useCallback(
    (lineId: string, itemId: string) => {
      const selectedItem = items.find((item) => item.id === itemId);

      setLineItemsDraft((current) =>
        current.map((entry) => {
          if (entry.id !== lineId) return entry;
          if (!selectedItem) return { ...entry, item_id: "" };
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
      if (!last) return [createEditableDraftLineItem()];
      const isLastEmpty =
        !last.description.trim() && toNumber(last.quantity) === 0 && toNumber(last.unit_price) === 0;
      if (isLastEmpty) return current;
      return [...current, createEditableDraftLineItem()];
    });
  }, []);

  const removeDraftLineItem = useCallback((lineId: string) => {
    setLineItemsDraft((current) => {
      if (current.length === 1) return current;
      return current.filter((entry) => entry.id !== lineId);
    });
  }, []);

  const handleSaveIssuedOverviewChanges = useCallback(async () => {
    if (!invoice || !id || invoice.status !== "issued") return;

    setIsSavingDraft(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("User not authenticated");

      const { error: invoiceError } = await supabase
        .from("finance_invoices_issued")
        .update({
          issue_date: issueDateDraft,
          due_date: dueDateDraft,
          notes: notesDraft || null,
          updated_by: user.id,
        })
        .eq("id", id)
        .eq("status", "issued");
      if (invoiceError) throw invoiceError;
      setEditingOverview(false);
      await loadInvoice(true);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || err?.details || "Failed to save issued invoice overview changes.");
    } finally {
      setIsSavingDraft(false);
    }
  }, [id, invoice, issueDateDraft, dueDateDraft, notesDraft, loadInvoice]);

  const handleSaveIssuedDocumentDetailsChanges = useCallback(async () => {
    if (!invoice || !id || invoice.status !== "issued") return;

    setIsSavingDraft(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("User not authenticated");

      const { error: invoiceError } = await supabase
        .from("finance_invoices_issued")
        .update({
          terms_and_conditions_snapshot: termsAndConditionsDraft || null,
          updated_by: user.id,
        })
        .eq("id", id)
        .eq("status", "issued");
      if (invoiceError) throw invoiceError;
      setEditingDocumentDetails(false);
      await loadInvoice(true);
    } catch (err) {
      console.error(err);
      setError("Failed to save issued invoice document details.");
    } finally {
      setIsSavingDraft(false);
    }
  }, [id, invoice, termsAndConditionsDraft, loadInvoice]);

  const handleSaveIssuedLineChanges = useCallback(async () => {
    if (!invoice || !id || invoice.status !== "issued") return;

    setIsSavingDraft(true);
    setError("");

    const cleanedLineItems = lineItemsDraft.map((row) => ({
      ...row,
      description: row.description.trim(),
    }));

    const hasAtLeastOneValidLine = cleanedLineItems.some(
      (row) => row.description && toNumber(row.quantity) > 0 && toNumber(row.unit_price) >= 0
    );

    if (!hasAtLeastOneValidLine) {
      setError("Issued invoice must include at least one valid line item.");
      setIsSavingDraft(false);
      return;
    }

    const hasInvalidLine = cleanedLineItems.some(
      (row) => !row.description || toNumber(row.quantity) <= 0 || toNumber(row.unit_price) < 0
    );

    if (hasInvalidLine) {
      setError(
        "Every issued invoice line must have a description, quantity greater than 0, and unit price 0 or higher."
      );
      setIsSavingDraft(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("User not authenticated");

      const existingIds = lineItems.map((entry) => entry.id);
      const draftIds = cleanedLineItems
        .filter((entry) => !entry.id.startsWith("new_"))
        .map((entry) => entry.id);
      const idsToDelete = existingIds.filter((entryId) => !draftIds.includes(entryId));

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("finance_invoice_issued_line_items")
          .delete()
          .in("id", idsToDelete);
        if (deleteError) throw deleteError;
      }

      for (let index = 0; index < cleanedLineItems.length; index += 1) {
        const row = cleanedLineItems[index];

        if (row.id.startsWith("new_")) {
          const { error: insertError } = await supabase
            .from("finance_invoice_issued_line_items")
            .insert({
              invoice_id: id,
              item_id: row.item_id || null,
              description: row.description.trim(),
              quantity: toNumber(row.quantity),
              unit_price: toNumber(row.unit_price),
              discount: toNumber(row.discount),
              tax_code_id: row.tax_code_id || null,
              unit_of_measure_id: row.unit_of_measure_id || null,
              revenue_category_id: row.revenue_category_id || null,
              sort_order: index + 1,
              status: "active",
              posted_to_ledger: false,
              metadata: {},
              created_by: user.id,
              updated_by: user.id,
            });
          if (insertError) throw insertError;
        } else {
          const { error: lineError } = await supabase
            .from("finance_invoice_issued_line_items")
            .update({
              item_id: row.item_id || null,
              description: row.description.trim(),
              quantity: toNumber(row.quantity),
              unit_price: toNumber(row.unit_price),
              discount: toNumber(row.discount),
              tax_code_id: row.tax_code_id || null,
              unit_of_measure_id: row.unit_of_measure_id || null,
              revenue_category_id: row.revenue_category_id || null,
              sort_order: index + 1,
              updated_by: user.id,
            })
            .eq("id", row.id)
            .eq("invoice_id", id);
          if (lineError) throw lineError;
        }
      }

      const { error: recalcError } = await supabase.rpc(
        "finance_recalculate_invoice_issued_totals",
        { p_invoice_id: id }
      );
      if (recalcError) throw recalcError;
      setEditingLines(false);
      await loadInvoice(true);
    } catch (err) {
      console.error(err);
      setError("Failed to save issued invoice line items.");
    } finally {
      setIsSavingDraft(false);
    }
  }, [id, invoice, lineItems, lineItemsDraft, loadInvoice]);

  const handleSaveDraftChanges = useCallback(async () => {
    if (!invoice || !id || !canEditDraft) return;

    setIsSavingDraft(true);
    setError("");

    const cleanedLineItems = lineItemsDraft.map((row) => ({
      ...row,
      description: row.description.trim(),
    }));

    const hasAtLeastOneValidLine = cleanedLineItems.some(
      (row) => row.description && toNumber(row.quantity) > 0 && toNumber(row.unit_price) >= 0
    );

    if (!hasAtLeastOneValidLine) {
      setError("Draft invoice must include at least one valid line item.");
      setIsSavingDraft(false);
      return;
    }

    const hasInvalidLine = cleanedLineItems.some(
      (row) => !row.description || toNumber(row.quantity) <= 0 || toNumber(row.unit_price) < 0
    );

    if (hasInvalidLine) {
      setError(
        "Every draft invoice line must have a description, quantity greater than 0, and unit price 0 or higher."
      );
      setIsSavingDraft(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("User not authenticated");

      const isCompany = clientIdDraft.startsWith("company:");
      const isClient = clientIdDraft.startsWith("client:");
      const resolvedClientId = isClient ? clientIdDraft.replace("client:", "") : null;
      const resolvedCompanyId = isCompany ? clientIdDraft.replace("company:", "") : null;
      const selectedPaymentMethod = paymentMethods.find((method) => method.id === paymentMethodIdDraft);
      const selectedCurrency = currencies.find((currency) => currency.id === currencyIdDraft);
      const selectedPaymentTerm = paymentTerms.find((term) => term.id === paymentTermsIdDraft);
      const selectedShippingTerm = shippingTerms.find((term) => term.id === shippingTermIdDraft);

      const { error: invoiceError } = await supabase
        .from("finance_invoices_issued")
        .update({
          client_id: resolvedClientId,
          counterparty_company_id: resolvedCompanyId,
          counterparty_type: isCompany ? "company" : "client",
          company_id: companyIdDraft || null,
          project_id: projectIdDraft || null,
          task_id: taskIdDraft || null,
          payment_terms_id: paymentTermsIdDraft || null,
          shipping_term_id: shippingTermIdDraft || null,
          bank_account_id: bankAccountIdDraft || null,
          currency_id: currencyIdDraft || null,
          currency_code: selectedCurrency?.currency_code || invoice.currency_code || "USD",
          issue_date: issueDateDraft,
          due_date: dueDateDraft,
          notes: notesDraft || null,
          company_name_snapshot: selectedDraftCompany?.legal_name || selectedDraftCompany?.name || null,
          company_contact_person_snapshot: selectedDraftCompany?.contact_person || null,
          company_address_snapshot: resolvedDraftCompanyAddress || null,
          company_email_snapshot: selectedDraftCompany?.email || null,
          company_phone_snapshot: selectedDraftCompany?.phone || null,
          counterparty_name_snapshot: resolvedDraftRecipientName || null,
          counterparty_legal_name_snapshot: resolvedDraftRecipientName || null,
          counterparty_contact_person_snapshot: resolvedDraftRecipientContact || null,
          counterparty_email_snapshot: resolvedDraftRecipientEmail || null,
          counterparty_phone_snapshot: resolvedDraftRecipientPhone || null,
          client_name_snapshot: selectedDraftClient?.legal_name || selectedDraftClient?.name || null,
          client_contact_person_snapshot: selectedDraftClient?.contact_person || null,
          client_email_snapshot:
            selectedDraftClient?.company_email || selectedDraftClient?.personnel_email || null,
          client_phone_snapshot:
            selectedDraftClient?.company_phone || selectedDraftClient?.personnel_phone || null,
          billing_address_snapshot: resolvedDraftRecipientAddress || null,
          payment_terms_snapshot:
            selectedPaymentTerm?.document_label || selectedPaymentTerm?.name || null,
          shipping_terms_snapshot: selectedShippingTerm?.description?.trim()
            ? `${selectedShippingTerm.name} — ${selectedShippingTerm.description.trim()}`
            : selectedShippingTerm?.name || selectedShippingTerm?.code || null,
          terms_and_conditions_snapshot: termsAndConditionsDraft || null,
          bank_details_snapshot: buildBankDetailsSnapshotFromAccount(selectedDraftBankAccount),
          updated_by: user.id,
          metadata: {
            ...(invoice.metadata || {}),
            preferred_payment_method_id: paymentMethodIdDraft || null,
            preferred_payment_method_name: selectedPaymentMethod?.name || null,
            preferred_payment_method_code: selectedPaymentMethod?.code || null,
            bank_account_id: bankAccountIdDraft || null,
            bank_account_name: selectedDraftBankAccount?.name || null,
            bank_name:
              selectedDraftBankAccount?.bank_name ||
              selectedDraftBankAccount?.institution_name ||
              null,
            beneficiary_name: selectedDraftBankAccount?.beneficiary_name || null,
            bank_address_snapshot: buildBankAddressFromAccount(selectedDraftBankAccount) || null,
            iban: selectedDraftBankAccount?.iban || null,
            swift_code:
              selectedDraftBankAccount?.swift_code ||
              (selectedDraftBankAccount?.account_identifier_type?.toLowerCase() === "swift"
                ? selectedDraftBankAccount?.account_identifier_value
                : null),
            bank_identifier_type: selectedDraftBankAccount?.account_identifier_type || null,
            bank_identifier_value: selectedDraftBankAccount?.account_identifier_value || null,
            account_number:
              selectedDraftBankAccount?.account_number ||
              selectedDraftBankAccount?.masked_account_number ||
              null,
            bank_account_currency_code: selectedDraftBankAccount?.currency_code || null,
          },
        })
        .eq("id", id)
        .eq("status", "draft");
      if (invoiceError) throw invoiceError;

      const existingIds = lineItems.map((entry) => entry.id);
      const draftIds = cleanedLineItems
        .filter((entry) => !entry.id.startsWith("new_"))
        .map((entry) => entry.id);
      const idsToDelete = existingIds.filter((entryId) => !draftIds.includes(entryId));

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("finance_invoice_issued_line_items")
          .delete()
          .in("id", idsToDelete);
        if (deleteError) throw deleteError;
      }

      for (let index = 0; index < cleanedLineItems.length; index += 1) {
        const row = cleanedLineItems[index];
        if (row.id.startsWith("new_")) {
          const { error: insertError } = await supabase
            .from("finance_invoice_issued_line_items")
            .insert({
              invoice_id: id,
              item_id: row.item_id || null,
              description: row.description.trim(),
              quantity: toNumber(row.quantity),
              unit_price: toNumber(row.unit_price),
              discount: toNumber(row.discount),
              tax_code_id: row.tax_code_id || null,
              unit_of_measure_id: row.unit_of_measure_id || null,
              revenue_category_id: row.revenue_category_id || null,
              sort_order: index + 1,
              status: "active",
              posted_to_ledger: false,
              metadata: {},
              created_by: user.id,
              updated_by: user.id,
            });
          if (insertError) throw insertError;
        } else {
          const { error: lineError } = await supabase
            .from("finance_invoice_issued_line_items")
            .update({
              item_id: row.item_id || null,
              description: row.description.trim(),
              quantity: toNumber(row.quantity),
              unit_price: toNumber(row.unit_price),
              discount: toNumber(row.discount),
              tax_code_id: row.tax_code_id || null,
              unit_of_measure_id: row.unit_of_measure_id || null,
              revenue_category_id: row.revenue_category_id || null,
              sort_order: index + 1,
              updated_by: user.id,
            })
            .eq("id", row.id)
            .eq("invoice_id", id);
          if (lineError) throw lineError;
        }
      }

      const { error: recalcError } = await supabase.rpc(
        "finance_recalculate_invoice_issued_totals",
        { p_invoice_id: id }
      );
      if (recalcError) throw recalcError;
      closeAllEditors();
      await loadInvoice(true);
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
    closeAllEditors,
    companyIdDraft,
    currencies,
    currencyIdDraft,
    dueDateDraft,
    id,
    invoice,
    issueDateDraft,
    lineItems,
    lineItemsDraft,
    loadInvoice,
    notesDraft,
    paymentMethodIdDraft,
    paymentMethods,
    paymentTerms,
    paymentTermsIdDraft,
    projectIdDraft,
    resolvedDraftCompanyAddress,
    resolvedDraftRecipientAddress,
    resolvedDraftRecipientContact,
    resolvedDraftRecipientEmail,
    resolvedDraftRecipientName,
    resolvedDraftRecipientPhone,
    selectedDraftBankAccount,
    selectedDraftClient,
    selectedDraftCompany,
    shippingTermIdDraft,
    shippingTerms,
    taskIdDraft,
    termsAndConditionsDraft,
  ]);

  const printableInvoice = useMemo(() => {
    if (!invoice) return invoice;

    const resolvedPaymentTerm =
      selectedDraftPaymentTerm ||
      paymentTerms.find(
        (entry) => entry.id === paymentTermsIdDraft || entry.id === invoice.payment_terms_id
      ) ||
      null;
    const resolvedShippingTerms =
      selectedDraftShippingTermsLabel !== "—"
        ? selectedDraftShippingTermsLabel
        : invoice.shipping_terms_snapshot;
    const resolvedPaymentTermsLabel =
      resolvedPaymentTerm?.document_label ||
      resolvedPaymentTerm?.name ||
      invoice.payment_terms_snapshot ||
      "—";
    const resolvedPaymentTermsText =
      resolvedPaymentTerm?.document_terms_text ||
      (invoice as any).payment_terms_document_text ||
      (invoice as any).payment_terms_text_snapshot ||
      (invoice as any).payment_terms_description ||
      "";

    if (invoice.status !== "draft") {
      return {
        ...invoice,
        payment_terms_snapshot: resolvedPaymentTermsLabel,
        payment_terms_document_text: resolvedPaymentTermsText,
        shipping_terms_snapshot: resolvedShippingTerms,
        terms_and_conditions_snapshot: termsAndConditionsDraft || invoice.terms_and_conditions_snapshot,
        currency_code: invoice.currency_code || "USD",
      };
    }

    const draftBankDetails =
      buildBankDetailsSnapshotFromAccount(selectedDraftBankAccount) || invoice.bank_details_snapshot;

    return {
      ...invoice,
      company_name_snapshot:
        selectedDraftCompany?.legal_name || selectedDraftCompany?.name || invoice.company_name_snapshot,
      company_contact_person_snapshot:
        selectedDraftCompany?.contact_person || invoice.company_contact_person_snapshot,
      company_address_snapshot: resolvedDraftCompanyAddress || invoice.company_address_snapshot,
      company_email_snapshot: selectedDraftCompany?.email || invoice.company_email_snapshot,
      company_phone_snapshot: selectedDraftCompany?.phone || invoice.company_phone_snapshot,
      counterparty_name_snapshot:
        resolvedDraftRecipientName || invoice.counterparty_name_snapshot || invoice.client_name_snapshot,
      client_name_snapshot:
        selectedDraftClient?.legal_name || selectedDraftClient?.name || invoice.client_name_snapshot,
      client_contact_person_snapshot:
        selectedDraftClient?.contact_person || invoice.client_contact_person_snapshot,
      client_email_snapshot:
        selectedDraftClient?.company_email ||
        selectedDraftClient?.personnel_email ||
        invoice.client_email_snapshot,
      client_phone_snapshot:
        selectedDraftClient?.company_phone ||
        selectedDraftClient?.personnel_phone ||
        invoice.client_phone_snapshot,
      billing_address_snapshot: resolvedDraftRecipientAddress || invoice.billing_address_snapshot,
      payment_terms_snapshot: resolvedPaymentTermsLabel,
      payment_terms_document_text: resolvedPaymentTermsText,
      shipping_terms_snapshot: resolvedShippingTerms,
      terms_and_conditions_snapshot: termsAndConditionsDraft || invoice.terms_and_conditions_snapshot,
      bank_details_snapshot: draftBankDetails,
      currency_code: selectedDraftCurrency?.currency_code || invoice.currency_code || "USD",
    };
  }, [
    invoice,
    paymentTerms,
    paymentTermsIdDraft,
    resolvedDraftCompanyAddress,
    resolvedDraftRecipientAddress,
    resolvedDraftRecipientName,
    selectedDraftBankAccount,
    selectedDraftClient,
    selectedDraftCompany,
    selectedDraftCurrency,
    selectedDraftPaymentTerm,
    selectedDraftShippingTermsLabel,
    termsAndConditionsDraft,
  ]);

  if (isLoading) {
    return <AixiaLoadingState title="Loading invoice" description="Invoice document data is loading." />;
  }

  if (!invoice || !totals) {
    return (
      <AixiaPage>
        <AixiaEmptyState
          icon={FileText}
          title="Invoice not found"
          description="The requested invoice could not be loaded."
        />
      </AixiaPage>
    );
  }

  const displayState = getInvoiceDisplayState(invoice as any);
  const visibleArchiveItems = archiveItems.filter((item) => item.status === archiveTab);
  const paymentProgressPercent = (() => {
    const total = Number(invoice.total_amount || 0);
    const paid = Number(invoice.paid_amount || 0);
    if (total <= 0) return 0;
    return Math.max(0, Math.min((paid / total) * 100, 100));
  })();
  const printableLineItems = lineItems.map((row) => ({
    id: row.id,
    description: row.description || "—",
    quantity: toNumber(row.quantity),
    unitPrice: toNumber(row.unit_price),
    discount: toNumber(row.discount),
    lineTotal: toNumber(row.line_total),
  }));
  const currentCurrencyCode = selectedDraftCurrency?.currency_code || invoice.currency_code || "USD";

  const handleSaveOverview = () => {
    if (canEditDraft) {
      void handleSaveDraftChanges();
      return;
    }
    if (canEditIssuedOverview) void handleSaveIssuedOverviewChanges();
  };

  const handleSaveFinancialSettings = () => {
    if (canEditDraft) void handleSaveDraftChanges();
  };

  const handleSaveDocumentDetails = () => {
    if (canEditDraft) {
      void handleSaveDraftChanges();
      return;
    }
    if (canEditIssuedDetails) void handleSaveIssuedDocumentDetailsChanges();
  };

  const handleSaveLines = () => {
    if (canEditDraft) {
      void handleSaveDraftChanges();
      return;
    }
    if (invoice.status === "issued") void handleSaveIssuedLineChanges();
  };

  return (
    <>
      <AixiaPage>
        <AixiaHero
          parentLabel="Invoices"
          parentPath="/finance/transactions/invoices"
          badges={[
            { label: "Invoice Workspace", tone: "cyan" },
            { label: getIssuedInvoiceStatusLabel(invoice.status), tone: "violet" },
            { label: getIssuedInvoicePaymentStatusLabel(invoice.payment_status), tone: "emerald" },
            { label: getPostingStatusLabel(displayState.postingStatus), tone: "neutral" },
            ...(displayState.isOverdue ? [{ label: "Overdue", tone: "rose" as const }] : []),
          ]}
          gradientTitle={invoice.invoice_number || "Invoice"}
          title=""
          subtitle="Outbound receivable document"
          description="Final outbound receivable document issued by your company to the recipient. Drafts remain editable; issued records keep frozen commercial snapshots."
          statusCards={[
            {
              label: "Recipient",
              value:
                invoice.status === "draft"
                  ? resolvedDraftRecipientName || "—"
                  : resolvedIssuedRecipientName || "—",
              description: "Recipient selected for this invoice.",
              icon: CheckCircle,
              tone: "cyan",
            },
            {
              label: "Balance Due",
              value: formatFinanceMoney(financialSummary?.balance ?? 0, currentCurrencyCode),
              description: "Remaining amount after confirmed payments.",
              icon: WalletCards,
              tone: "amber",
            },
            {
              label: "Payment Progress",
              value: `${Math.round(paymentProgressPercent)}%`,
              description: "Confirmed payments against invoice total.",
              icon: CreditCard,
              tone: "emerald",
            },
          ]}
          actions={
            <>
              {canRecordPayment ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() =>
                    navigate(`/finance/transactions/payments-received/new?invoice_id=${invoice.id}`)
                  }
                >
                  <CheckCircle className="h-4 w-4" />
                  Record Payment
                </AixiaButton>
              ) : null}

              <AixiaButton type="button" variant="secondary" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Print
              </AixiaButton>

              {invoice.status === "draft" ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  disabled={isIssuing || isSavingDraft}
                  onClick={() => void handleIssue()}
                >
                  <CheckCircle className="h-4 w-4" />
                  {isIssuing ? "Issuing..." : "Issue Invoice"}
                </AixiaButton>
              ) : null}

              {canArchive ? (
                <AixiaButton
                  type="button"
                  variant="danger"
                  disabled={isArchiving}
                  onClick={() => void handleArchive()}
                >
                  <Archive className="h-4 w-4" />
                  {isArchiving ? "Archiving..." : "Archive"}
                </AixiaButton>
              ) : null}

              {invoice.status !== "deleted" && invoice.status !== "archived" ? (
                <AixiaButton
                  type="button"
                  variant="danger"
                  disabled={isDeleting}
                  onClick={() => void handleDelete()}
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </AixiaButton>
              ) : null}
            </>
          }
        />

        {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}

        <AixiaMetricGrid>
          <AixiaMetricCard
            label="Subtotal"
            value={formatFinanceMoney(financialSummary?.subtotal ?? 0, currentCurrencyCode)}
            description="Before discount and tax."
            icon={Receipt}
            tone="cyan"
          />
          <AixiaMetricCard
            label="Discount"
            value={formatFinanceMoney(financialSummary?.discount ?? 0, currentCurrencyCode)}
            description="Commercial discount."
            icon={Receipt}
            tone="amber"
          />
          <AixiaMetricCard
            label="Tax"
            value={formatFinanceMoney(financialSummary?.tax ?? 0, currentCurrencyCode)}
            description="Based on selected tax codes."
            icon={Receipt}
            tone="violet"
          />
          <AixiaMetricCard
            label="Total"
            value={formatFinanceMoney(financialSummary?.total ?? 0, currentCurrencyCode)}
            description="Invoice value."
            icon={CheckCircle}
            tone="emerald"
          />
        </AixiaMetricGrid>

        <AixiaSmartLayout
          sidebar="normal"
          balance="main"
          bottomSpan="never"
          sideRebalance="last-to-bottom"
          main={
            <>
              <AixiaSection
                title="Document Overview"
                description="Recipient, issuing company, dates, currency, and project context."
                icon={FileText}
                actions={
                  canEditDraft || canEditIssuedOverview ? (
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
                            void loadInvoice(true);
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
                  ) : null
                }
              >
                <AixiaFormGrid columns="three">
                  <AixiaFormField>
                    <AixiaFieldLabel label="Recipient" />
                    {editingOverview && invoice.status === "draft" ? (
                      <AixiaSelectField
                        value={clientIdDraft}
                        onChange={(event) => setClientIdDraft(event.target.value)}
                      >
                        <option value="">Select recipient</option>
                        <optgroup label="Clients">
                          {clients.map((client) => (
                            <option key={client.id} value={`client:${client.id}`}>
                              {client.legal_name || client.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Companies (Intercompany)">
                          {companies
                            .filter((company) => company.id !== companyIdDraft)
                            .map((company) => (
                              <option key={company.id} value={`company:${company.id}`}>
                                {company.legal_name || company.name}
                              </option>
                            ))}
                        </optgroup>
                      </AixiaSelectField>
                    ) : (
                      <AixiaValueBlock
                        label="Recipient"
                        value={
                          invoice.status === "draft"
                            ? resolvedDraftRecipientName || "—"
                            : resolvedIssuedRecipientName || "—"
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Issuing Company" />
                    {editingOverview && invoice.status === "draft" ? (
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
                      <AixiaValueBlock
                        label="Issuing Company"
                        value={
                          invoice.status === "draft"
                            ? selectedDraftCompany?.legal_name || selectedDraftCompany?.name || "—"
                            : invoice.company_name_snapshot || "—"
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaValueBlock
                    label="Invoice Status"
                    value={<AixiaStatusBadge value={invoice.status} />}
                  />

                  <AixiaFormField>
                    <AixiaFieldLabel label="Issue Date" />
                    {editingOverview ? (
                      <AixiaInputField
                        type="date"
                        value={issueDateDraft}
                        onChange={(event) => setIssueDateDraft(event.target.value)}
                      />
                    ) : (
                      <AixiaValueBlock
                        label="Issue Date"
                        value={
                          invoice.status === "draft"
                            ? formatFinanceDate(issueDateDraft)
                            : formatFinanceDate(invoice.issue_date)
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Due Date" />
                    {editingOverview ? (
                      <AixiaInputField
                        type="date"
                        value={dueDateDraft}
                        onChange={(event) => setDueDateDraft(event.target.value)}
                      />
                    ) : (
                      <AixiaValueBlock
                        label="Due Date"
                        value={
                          invoice.status === "draft"
                            ? formatFinanceDate(dueDateDraft)
                            : formatFinanceDate(invoice.due_date)
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Currency" />
                    {editingOverview && invoice.status === "draft" ? (
                      <AixiaSelectField
                        value={currencyIdDraft}
                        onChange={(event) => setCurrencyIdDraft(event.target.value)}
                      >
                        <option value="">Select currency</option>
                        {currencies.map((currency) => (
                          <option key={currency.id} value={currency.id}>
                            {currency.currency_code} — {currency.currency_name}
                          </option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaValueBlock label="Currency" value={currentCurrencyCode} />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Project" />
                    {editingOverview && invoice.status === "draft" ? (
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
                      <AixiaValueBlock
                        label="Project"
                        value={
                          invoice.status === "draft"
                            ? selectedDraftProject?.name || "—"
                            : project?.name || "—"
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Task" />
                    {editingOverview && invoice.status === "draft" ? (
                      <AixiaSelectField
                        value={taskIdDraft}
                        onChange={(event) => setTaskIdDraft(event.target.value)}
                      >
                        <option value="">No task</option>
                        {filteredDraftTasks.map((taskItem) => (
                          <option key={taskItem.id} value={taskItem.id}>
                            {taskItem.title}
                          </option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaValueBlock
                        label="Task"
                        value={
                          invoice.status === "draft"
                            ? selectedDraftTask?.title || "—"
                            : task?.title || "—"
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaValueBlock
                    label="Posted To Ledger"
                    value={invoice.posted_to_ledger ? "Posted" : "Not Posted"}
                  />

                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Notes" />
                    {editingOverview ? (
                      <AixiaTextareaField
                        value={notesDraft}
                        onChange={(event) => setNotesDraft(event.target.value)}
                        rows={4}
                      />
                    ) : (
                      <AixiaValueBlock
                        label="Notes"
                        value={invoice.status === "draft" ? notesDraft || "—" : invoice.notes || "—"}
                      />
                    )}
                  </AixiaFormFullWidth>
                </AixiaFormGrid>
              </AixiaSection>

              <AixiaSection
                title="Financial Settings"
                description="Payment terms, shipping terms, bank account, and payment method."
                icon={CheckCircle}
                actions={
                  canEditDraft ? (
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
                            void loadInvoice(true);
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
                  ) : null
                }
              >
                <AixiaFormGrid columns="two">
                  <AixiaFormField>
                    <AixiaFieldLabel label="Payment Terms" />
                    {editingFinancialSettings && canEditDraft ? (
                      <AixiaSelectField
                        value={paymentTermsIdDraft}
                        onChange={(event) => setPaymentTermsIdDraft(event.target.value)}
                      >
                        <option value="">Select payment terms</option>
                        {paymentTerms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {term.code} | {term.name}
                          </option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaValueBlock
                        label="Payment Terms"
                        value={
                          invoice.status === "draft"
                            ? getPaymentTermLabel(selectedDraftPaymentTerm)
                            : invoice.payment_terms_snapshot || "—"
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Shipping Terms" />
                    {editingFinancialSettings && canEditDraft ? (
                      <AixiaSelectField
                        value={shippingTermIdDraft}
                        onChange={(event) => setShippingTermIdDraft(event.target.value)}
                      >
                        <option value="">Select shipping terms</option>
                        {shippingTerms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {term.code} | {term.name}
                          </option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaValueBlock
                        label="Shipping Terms"
                        value={
                          invoice.status === "draft"
                            ? selectedDraftShippingTermsLabel
                            : invoice.shipping_terms_snapshot || "—"
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Bank Account" />
                    {editingFinancialSettings && canEditDraft ? (
                      <AixiaSelectField
                        value={bankAccountIdDraft}
                        onChange={(event) => setBankAccountIdDraft(event.target.value)}
                      >
                        <option value="">Select bank account</option>
                        {filteredDraftBankAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaValueBlock
                        label="Bank Account"
                        value={
                          invoice.status === "draft"
                            ? selectedDraftBankAccount?.name || "—"
                            : ((invoice.metadata?.bank_account_name as string) || "—")
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Preferred Payment Method" />
                    {editingFinancialSettings && canEditDraft ? (
                      <AixiaSelectField
                        value={paymentMethodIdDraft}
                        onChange={(event) => setPaymentMethodIdDraft(event.target.value)}
                      >
                        <option value="">Select payment method</option>
                        {paymentMethods.map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.name}
                          </option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaValueBlock
                        label="Preferred Payment Method"
                        value={
                          invoice.status === "draft"
                            ? selectedDraftPaymentMethod?.name || "—"
                            : ((invoice.metadata?.preferred_payment_method_name as string) ||
                                ((invoice.metadata?.preferred_payment_method_id as string) &&
                                  paymentMethods.find(
                                    (method) =>
                                      method.id ===
                                      (invoice.metadata?.preferred_payment_method_id as string)
                                  )?.name) ||
                                "—")
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormFullWidth>
                    <AixiaValueBlock
                      label="Bank Details"
                      value={resolvedBankDetailsLines.length > 0 ? resolvedBankDetailsLines.join("\n") : "—"}
                    />
                  </AixiaFormFullWidth>
                </AixiaFormGrid>
              </AixiaSection>

              <AixiaSection
                title="Document Details"
                description="Document snapshots for print, parties, payment, shipping, notes, and terms."
                icon={FileText}
                actions={
                  canEditDraft || canEditIssuedDetails ? (
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
                            void loadInvoice(true);
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
                  ) : null
                }
              >
                <AixiaReviewGrid variant="cards">
                  <AixiaValueBlock
                    label="Issuing Company"
                    value={
                      invoice.status === "draft"
                        ? selectedDraftCompany?.legal_name || selectedDraftCompany?.name || "—"
                        : invoice.company_name_snapshot || "—"
                    }
                    detail={
                      invoice.status === "draft"
                        ? [
                            selectedDraftCompany?.contact_person,
                            selectedDraftCompany?.email,
                            selectedDraftCompany?.phone,
                            resolvedDraftCompanyAddress,
                          ]
                            .filter(Boolean)
                            .join(" • ") || "—"
                        : [
                            invoice.company_contact_person_snapshot,
                            invoice.company_email_snapshot,
                            invoice.company_phone_snapshot,
                            invoice.company_address_snapshot,
                          ]
                            .filter(Boolean)
                            .join(" • ") || "—"
                    }
                  />
                  <AixiaValueBlock
                    label="Recipient"
                    value={
                      invoice.status === "draft"
                        ? resolvedDraftRecipientName || "—"
                        : resolvedIssuedRecipientName || "—"
                    }
                    detail={
                      invoice.status === "draft"
                        ? [
                            resolvedDraftRecipientContact,
                            resolvedDraftRecipientEmail,
                            resolvedDraftRecipientPhone,
                            resolvedDraftRecipientAddress,
                          ]
                            .filter(Boolean)
                            .join(" • ") || "—"
                        : [
                            resolvedIssuedRecipientContact,
                            resolvedIssuedRecipientEmail,
                            resolvedIssuedRecipientPhone,
                            invoice.billing_address_snapshot,
                          ]
                            .filter(Boolean)
                            .join(" • ") || "—"
                    }
                  />
                  <AixiaValueBlock
                    label="Payment Terms"
                    value={
                      invoice.status === "draft"
                        ? getPaymentTermLabel(selectedDraftPaymentTerm)
                        : invoice.payment_terms_snapshot || "—"
                    }
                  />
                  <AixiaValueBlock
                    label="Shipping Terms"
                    value={
                      invoice.status === "draft"
                        ? selectedDraftShippingTermsLabel
                        : invoice.shipping_terms_snapshot || "—"
                    }
                  />
                  <AixiaValueBlock label="Currency" value={currentCurrencyCode} />
                  <AixiaValueBlock
                    label="Project / Task"
                    value={
                      invoice.status === "draft"
                        ? [selectedDraftProject?.name, selectedDraftTask?.title]
                            .filter(Boolean)
                            .join(" / ") || "—"
                        : [project?.name, task?.title].filter(Boolean).join(" / ") || "—"
                    }
                  />
                </AixiaReviewGrid>

                <div className="aixia-stack">
                  <AixiaFieldLabel label="Terms & Conditions" />
                  {editingDocumentDetails ? (
                    <AixiaTextareaField
                      value={termsAndConditionsDraft}
                      onChange={(event) => setTermsAndConditionsDraft(event.target.value)}
                      rows={7}
                    />
                  ) : (
                    <AixiaValueBlock
                      label="Terms & Conditions"
                      value={
                        termsAndConditionsDraft || invoice.terms_and_conditions_snapshot || "—"
                      }
                    />
                  )}
                </div>
              </AixiaSection>

              <AixiaSection
                title="Line Items"
                description="Products and services included in this invoice."
                icon={SquarePen}
                smartScroll
                visibleCards={8}
                itemCount={(editingLines ? lineItemsDraft : lineItems).length}
                actions={
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

                    {editingLines && canEditDraft ? (
                      <AixiaButton type="button" variant="secondary" onClick={addDraftLineItem}>
                        Add Row
                      </AixiaButton>
                    ) : null}

                    {canEditDraft || invoice.status === "issued" ? (
                      <AixiaButton
                        type="button"
                        variant="primary"
                        onClick={() => setEditingLines((current) => !current)}
                      >
                        <SquarePen className="h-4 w-4" />
                        {editingLines ? "Close" : "Edit"}
                      </AixiaButton>
                    ) : null}
                  </>
                }
              >
                <div className="aixia-stack">
                  {(editingLines ? lineItemsDraft : lineItems).map((row, index) => {
                    const editable = editingLines;
                    const editableRow = row as EditableLineItem;
                    const readOnlyRow = row as LineItemRow;
                    const rowQuantity = editable
                      ? toNumber(editableRow.quantity)
                      : toNumber(readOnlyRow.quantity);
                    const rowUnitPrice = editable
                      ? toNumber(editableRow.unit_price)
                      : toNumber(readOnlyRow.unit_price);
                    const rowDiscount = editable
                      ? toNumber(editableRow.discount)
                      : toNumber(readOnlyRow.discount);
                    const rowTaxCodeId = editable ? editableRow.tax_code_id : readOnlyRow.tax_code_id || "";
                    const rowTaxRate = taxCodes.find((taxCode) => taxCode.id === rowTaxCodeId)?.rate_percent ?? 0;
                    const taxableBase = Math.max(rowQuantity * rowUnitPrice - rowDiscount, 0);
                    const rowTotal = editable
                      ? taxableBase + taxableBase * (toNumber(rowTaxRate) / 100)
                      : toNumber(readOnlyRow.line_total);

                    return (
                      <AixiaFormRowCard
                        key={(row as EditableLineItem | LineItemRow).id}
                        title={`Line ${index + 1}`}
                        onRemove={
                          editable && canEditDraft
                            ? () => removeDraftLineItem(editableRow.id)
                            : undefined
                        }
                        removeDisabled={lineItemsDraft.length === 1}
                      >
                        <AixiaFormGrid columns="three">
                          <AixiaFormField>
                            <AixiaFieldLabel label="Item" />
                            {editable ? (
                              <AixiaSelectField
                                value={editableRow.item_id}
                                onChange={(event) =>
                                  applyDraftItemSelection(editableRow.id, event.target.value)
                                }
                              >
                                <option value="">Select item</option>
                                {items.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name}
                                  </option>
                                ))}
                              </AixiaSelectField>
                            ) : (
                              <AixiaValueBlock
                                label="Item"
                                value={getInvoiceLineItemDisplayName(readOnlyRow, items)}
                              />
                            )}
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Description" />
                            {editable ? (
                              <AixiaInputField
                                value={editableRow.description}
                                onChange={(event) =>
                                  setLineItemsDraft((draft) =>
                                    draft.map((entry) =>
                                      entry.id === editableRow.id
                                        ? { ...entry, description: event.target.value }
                                        : entry
                                    )
                                  )
                                }
                              />
                            ) : (
                              <AixiaValueBlock label="Description" value={readOnlyRow.description || "—"} />
                            )}
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Qty" />
                            {editable ? (
                              <AixiaInputField
                                value={String(editableRow.quantity ?? "")}
                                onChange={(event) =>
                                  setLineItemsDraft((draft) =>
                                    draft.map((entry) =>
                                      entry.id === editableRow.id
                                        ? { ...entry, quantity: event.target.value }
                                        : entry
                                    )
                                  )
                                }
                              />
                            ) : (
                              <AixiaValueBlock label="Qty" value={rowQuantity} />
                            )}
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Unit" />
                            {editable ? (
                              <AixiaSelectField
                                value={editableRow.unit_of_measure_id}
                                onChange={(event) =>
                                  setLineItemsDraft((draft) =>
                                    draft.map((entry) =>
                                      entry.id === editableRow.id
                                        ? { ...entry, unit_of_measure_id: event.target.value }
                                        : entry
                                    )
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
                              <AixiaValueBlock
                                label="Unit"
                                value={getInvoiceLineUnitDisplayName(
                                  readOnlyRow,
                                  unitsOfMeasure,
                                )}
                              />
                            )}
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Unit Price" />
                            {editable ? (
                              <AixiaInputField
                                value={String(editableRow.unit_price ?? "")}
                                onChange={(event) =>
                                  setLineItemsDraft((draft) =>
                                    draft.map((entry) =>
                                      entry.id === editableRow.id
                                        ? { ...entry, unit_price: event.target.value }
                                        : entry
                                    )
                                  )
                                }
                              />
                            ) : (
                              <AixiaValueBlock
                                label="Unit Price"
                                value={formatFinanceMoney(rowUnitPrice, currentCurrencyCode)}
                              />
                            )}
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Discount" />
                            {editable ? (
                              <AixiaInputField
                                value={String(editableRow.discount ?? "")}
                                onChange={(event) =>
                                  setLineItemsDraft((draft) =>
                                    draft.map((entry) =>
                                      entry.id === editableRow.id
                                        ? { ...entry, discount: event.target.value }
                                        : entry
                                    )
                                  )
                                }
                              />
                            ) : (
                              <AixiaValueBlock
                                label="Discount"
                                value={formatFinanceMoney(rowDiscount, currentCurrencyCode)}
                              />
                            )}
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Tax Code" />
                            {editable ? (
                              <AixiaSelectField
                                value={editableRow.tax_code_id}
                                onChange={(event) =>
                                  setLineItemsDraft((draft) =>
                                    draft.map((entry) =>
                                      entry.id === editableRow.id
                                        ? { ...entry, tax_code_id: event.target.value }
                                        : entry
                                    )
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
                              <AixiaValueBlock
                                label="Tax Code"
                                value={getInvoiceLineTaxDisplayName(readOnlyRow, taxCodes)}
                              />
                            )}
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Revenue Category" />
                            {editable ? (
                              <AixiaSelectField
                                value={editableRow.revenue_category_id}
                                onChange={(event) =>
                                  setLineItemsDraft((draft) =>
                                    draft.map((entry) =>
                                      entry.id === editableRow.id
                                        ? { ...entry, revenue_category_id: event.target.value }
                                        : entry
                                    )
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
                              <AixiaValueBlock
                                label="Revenue Category"
                                value={getInvoiceLineRevenueCategoryDisplayName(
                                  readOnlyRow,
                                  revenueCategories,
                                )}
                              />
                            )}
                          </AixiaFormField>

                          <AixiaValueBlock
                            label="Line Total"
                            value={formatFinanceMoney(rowTotal, currentCurrencyCode)}
                          />
                        </AixiaFormGrid>
                      </AixiaFormRowCard>
                    );
                  })}
                </div>
              </AixiaSection>
            </>
          }
          side={
            <>
              <AixiaSection
                title="Financial Summary"
                description="Live totals, collection state, and remaining balance."
                icon={WalletCards}
              >
                <AixiaReviewGrid variant="cards">
                  <AixiaValueBlock
                    label="Subtotal"
                    value={formatFinanceMoney(financialSummary?.subtotal ?? 0, currentCurrencyCode)}
                  />
                  <AixiaValueBlock
                    label="Discount"
                    value={formatFinanceMoney(financialSummary?.discount ?? 0, currentCurrencyCode)}
                  />
                  <AixiaValueBlock
                    label="Tax"
                    value={formatFinanceMoney(financialSummary?.tax ?? 0, currentCurrencyCode)}
                  />
                  <AixiaValueBlock
                    label="Total"
                    value={formatFinanceMoney(financialSummary?.total ?? 0, currentCurrencyCode)}
                  />
                  <AixiaValueBlock
                    label="Paid"
                    value={formatFinanceMoney(financialSummary?.paid ?? 0, currentCurrencyCode)}
                  />
                  <AixiaValueBlock
                    label="Balance Due"
                    value={formatFinanceMoney(financialSummary?.balance ?? 0, currentCurrencyCode)}
                  />
                </AixiaReviewGrid>
              </AixiaSection>

              <AixiaSection
                title="Linked Documents"
                description="Payments and related receivable records."
                icon={Link2}
              >
                <AixiaReviewGrid variant="cards">
                  <AixiaActionCard
                    label="Source Proforma Invoice"
                    value={linkedProformaInvoice?.proforma_number || "—"}
                    description={
                      linkedProformaInvoice
                        ? `${linkedProformaInvoice.status} · ${formatFinanceMoney(
                            toNumber(linkedProformaInvoice.total_amount),
                            linkedProformaInvoice.currency_code || currentCurrencyCode
                          )}`
                        : "This invoice was created manually or has no PI source."
                    }
                    icon={Link2}
                    tone="violet"
                    actionLabel="Open"
                    onClick={
                      linkedProformaInvoice
                        ? () =>
                            navigate(
                              `/finance/transactions/proforma-invoices/${linkedProformaInvoice.id}`
                            )
                        : undefined
                    }
                  />
                  <AixiaValueBlock
                    label="Payment Progress"
                    value={`${Math.round(paymentProgressPercent)}%`}
                    detail={`${formatFinanceMoney(toNumber(invoice.paid_amount), currentCurrencyCode)} paid · ${formatFinanceMoney(toNumber(invoice.balance_due), currentCurrencyCode)} remaining`}
                  />
                  <AixiaValueBlock
                    label="Payments Received"
                    value={payments.length}
                    detail="Confirmed payments linked to this invoice."
                  />
                </AixiaReviewGrid>

                {payments.length === 0 ? (
                  <AixiaEmptyState
                    icon={FileText}
                    title="No payments yet"
                    description="Confirmed payments linked to this invoice will appear here."
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
                              payment.payment_currency_code || currentCurrencyCode
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

              <AixiaSection
                title="Archive"
                description="Soft-delete, archive, restore, and hard-delete controls."
                icon={Archive}
                actions={
                  <AixiaButton
                    type="button"
                    variant="danger"
                    onClick={() => {
                      setShowArchivePopup(true);
                      setArchiveTab("archived");
                      void loadArchiveItems();
                    }}
                  >
                    Open Archive
                  </AixiaButton>
                }
              >
                <AixiaAlert tone="info">
                  Archive moves the invoice to archived. Delete moves the invoice to deleted. Hard
                  delete is available only from the deleted tab.
                </AixiaAlert>
              </AixiaSection>
            </>
          }
        />

        <AixiaArchiveManagerModal
          open={showArchivePopup}
          title="Invoice Archive"
          description="Restore archived invoices or permanently delete records from the deleted tab."
          archivedCount={archiveItems.filter((item) => item.status === "archived").length}
          deletedCount={archiveItems.filter((item) => item.status === "deleted").length}
          activeTab={archiveTab}
          onTabChange={setArchiveTab}
          onClose={() => setShowArchivePopup(false)}
        >
          {visibleArchiveItems.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title={`No ${archiveTab} invoices`}
              description={`No ${archiveTab} invoices were found.`}
            />
          ) : (
            <AixiaTableShell variant="archive" minWidthClassName="min-w-[880px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Invoice</th>
                  <th>Recipient</th>
                  <th>Total</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleArchiveItems.map((item) => (
                  <tr key={item.id} className="aixia-table-row">
                    <AixiaTableTextCell
                      width="md"
                      primary={item.invoice_number || "Invoice"}
                      secondary={item.status}
                    />
                    <AixiaTableTextCell
                      width="lg"
                      primary={item.counterparty_name_snapshot || item.client_name_snapshot || "—"}
                    />
                    <AixiaTableTextCell
                      width="sm"
                      primary={formatFinanceMoney(toNumber(item.total_amount), currentCurrencyCode)}
                    />
                    <AixiaTableTextCell
                      width="sm"
                      primary={formatFinanceDate(item.updated_at || null)}
                    />
                    <AixiaTableActionsCell>
                      <AixiaButton
                        type="button"
                        variant="secondary"
                        disabled={isDeleting}
                        onClick={() => void handleRestore(item.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </AixiaButton>
                      {archiveTab === "deleted" ? (
                        <AixiaButton
                          type="button"
                          variant="danger"
                          disabled={isDeleting}
                          onClick={() => void handleHardDelete(item.id)}
                        >
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

      <InvoicePrintDocument
        invoice={printableInvoice}
        lineItems={printableLineItems}
        financialSummary={financialSummary}
      />
    </>
  );
}
