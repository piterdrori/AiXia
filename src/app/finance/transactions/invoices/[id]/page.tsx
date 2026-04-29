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

import {
  formatFinanceDate,
  formatFinanceMoney,
  getInvoiceDisplayState,
  getIssuedInvoiceById,
  getIssuedInvoicePaymentStatusLabel,
  getIssuedInvoiceStatusLabel,
  type InvoicePostingStatus,
} from "@/lib/finance/invoicesIssued";
import InvoicePrintDocument from "./InvoicePrintDocument";

type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "deleted"
  | "archived";

type InvoicePaymentStatus = "unpaid" | "partial" | "paid";

type InvoiceRecord = {
  id: string;
  invoice_number: string | null;
  status: InvoiceStatus;
  payment_status: InvoicePaymentStatus;
  counterparty_type: "client" | "company";
  counterparty_company_id: string | null;
  counterparty_name_snapshot: string | null;
  counterparty_legal_name_snapshot: string | null;
  counterparty_contact_person_snapshot: string | null;
  counterparty_email_snapshot: string | null;
  counterparty_phone_snapshot: string | null;
  client_id: string | null;
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
  proforma_invoice_id: string | null;
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
  invoice_id: string;
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
  project_id?: string | null;
  task_id?: string | null;
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
  invoice_number: string | null;
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

type ProformaInvoiceSource = {
  id: string;
  proforma_number: string | null;
  client_id: string | null;
  client_po_id: string | null;
  quotation_id: string | null;
  company_id: string | null;
  issue_date: string | null;
  valid_until: string | null;
  status: string;
  currency_id: string | null;
  currency_code: string | null;
  total_amount: number | string | null;
  notes: string | null;
  project_id: string | null;
  task_id: string | null;
  payment_terms_id: string | null;
  shipping_term_id: string | null;
  bank_account_id: string | null;
  metadata: Record<string, unknown> | null;
};

type ProformaInvoiceLineSource = {
  id: string;
  proforma_invoice_id: string;
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

function getDocumentStatusBadgeClasses(status: InvoiceStatus) {
  if (status === "issued") {
    return "border-sky-400/20 bg-sky-500/10 text-sky-200";
  }

  if (status === "draft") {
    return "border-white/10 bg-white/10 text-white/75";
  }

  if (status === "partially_paid") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-200";
  }

  if (status === "paid") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "archived") {
    return "border-white/20 bg-white/5 text-white/60";
  }

  if (status === "deleted") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  }

  return "border-white/10 bg-white/10 text-white/75";
}

function getPaymentStatusBadgeClasses(status: InvoicePaymentStatus) {
  if (status === "paid") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "partial") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-200";
  }

  return "border-rose-400/20 bg-rose-500/10 text-rose-200";
}

function getPostingStatusBadgeClasses(status: InvoicePostingStatus) {
  if (status === "posted") {
    return "border-violet-400/20 bg-violet-500/10 text-violet-200";
  }

  return "border-white/10 bg-white/10 text-white/75";
}

function getPostingStatusLabel(status: InvoicePostingStatus) {
  return status === "posted" ? "Posted" : "Not posted";
}

function getOverdueBadgeClasses() {
  return "border-rose-400/20 bg-rose-500/10 text-rose-200";
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
  const [proformaSources, setProformaSources] = useState<
    ProformaInvoiceSource[]
  >([]);

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
    "manual" | "proforma_invoice"
  >("manual");
  const [sourceProformaIdDraft, setSourceProformaIdDraft] = useState("");
  const [linkedProforma, setLinkedProforma] =
    useState<ProformaInvoiceSource | null>(null);

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

      if (refreshOnly) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const [
          { invoice, lineItems },
          paymentsResult,
          projectResult,
          linkedProformaResult,
        ] = await Promise.all([
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
          supabase
            .from("finance_invoices_issued")
            .select(
              "proforma:finance_proforma_invoices(id, proforma_number, client_id, client_po_id, quotation_id, company_id, issue_date, valid_until, status, currency_id, currency_code, total_amount, notes, project_id, task_id, payment_terms_id, shipping_term_id, bank_account_id, metadata)"
            )
            .eq("id", id)
            .maybeSingle(),
          loadArchiveItems(),
        ]);

        if (paymentsResult.error) throw paymentsResult.error;

        if (projectResult.error) {
          console.warn(
            "Failed to load linked project/task for invoice:",
            projectResult.error
          );
        }

        if (linkedProformaResult.error) {
          console.warn(
            "Failed to load linked proforma for invoice:",
            linkedProformaResult.error
          );
        }

        const typedInvoice = invoice as unknown as InvoiceRecord;
        const typedLineItems = (lineItems || []) as unknown as LineItemRow[];
        const typedPayments = (paymentsResult.data || []) as PaymentRow[];
        const linkedProject = (projectResult.data as any)?.project ?? null;
        const linkedTask = (projectResult.data as any)?.task ?? null;
        const linkedProformaRow =
          ((linkedProformaResult.data as any)?.proforma ||
            null) as ProformaInvoiceSource | null;

        setInvoice(typedInvoice);
        setLineItems(typedLineItems);
        setPayments(typedPayments);
        setProject(linkedProject);
        setTask(linkedTask);
        setLinkedProforma(linkedProformaRow);

        setSourceModeDraft(
          typedInvoice.proforma_invoice_id || linkedProformaRow
            ? "proforma_invoice"
            : "manual"
        );
        setSourceProformaIdDraft(
          typedInvoice.proforma_invoice_id || linkedProformaRow?.id || ""
        );

        setIssueDateDraft(getDateInputValue(typedInvoice.issue_date));
        setDueDateDraft(getDateInputValue(typedInvoice.due_date));
        setNotesDraft(typedInvoice.notes || "");
        setTermsAndConditionsDraft(
          typedInvoice.terms_and_conditions_snapshot || ""
        );

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
        setError("Failed to load invoice.");
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
        linkedInvoiceIdsResult,
        proformaSourcesResult,
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

        supabase
          .from("finance_invoices_issued")
          .select("proforma_invoice_id")
          .not("proforma_invoice_id", "is", null),

        supabase
          .from("finance_proforma_invoices")
          .select(
            "id, proforma_number, client_id, client_po_id, quotation_id, company_id, issue_date, valid_until, status, currency_id, currency_code, total_amount, notes, project_id, task_id, payment_terms_id, shipping_term_id, bank_account_id, metadata"
          )
          .in("status", ["issued", "confirmed"])
          .order("updated_at", { ascending: false }),
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
      if (linkedInvoiceIdsResult.error) throw linkedInvoiceIdsResult.error;
      if (proformaSourcesResult.error) throw proformaSourcesResult.error;

      const linkedProformaIds = new Set(
        ((linkedInvoiceIdsResult.data || []) as Array<{
          proforma_invoice_id: string | null;
        }>)
          .map((row) => row.proforma_invoice_id)
          .filter(Boolean) as string[]
      );

      setClients((clientsResult.data || []) as ClientOption[]);
      setCompanies((companiesResult.data || []) as CompanyOption[]);
      setProjects((projectsResult.data || []) as ProjectRow[]);
      setTasks((tasksResult.data || []) as TaskRow[]);
      setPaymentTerms((paymentTermsResult.data || []) as PaymentTermOption[]);
      setShippingTerms((shippingTermsResult.data || []) as ShippingTermOption[]);
      setBankAccounts((bankAccountsResult.data || []) as BankAccountOption[]);
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
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

      setProformaSources(
        ((proformaSourcesResult.data || []) as ProformaInvoiceSource[]).filter(
          (proforma) =>
            !linkedProformaIds.has(proforma.id) ||
            proforma.id === invoice?.proforma_invoice_id
        )
      );
    } catch (err) {
      console.error("Failed to load invoice master data:", err);
    }
  }, [invoice?.proforma_invoice_id]);

  useEffect(() => {
    void loadInvoice();
    void loadMasterData();
  }, [loadInvoice, loadMasterData]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`invoice-issued-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_invoices_issued",
          filter: `id=eq.${id}`,
        },
        () => void loadInvoice(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_invoice_issued_line_items",
          filter: `invoice_id=eq.${id}`,
        },
        () => void loadInvoice(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payments_received",
        },
        () => void loadInvoice(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadInvoice]);

  const applyProformaSource = useCallback(
    async (proformaId: string) => {
      if (!proformaId) {
        setSourceModeDraft("manual");
        setSourceProformaIdDraft("");
        setLinkedProforma(null);
        setLineItemsDraft([createEditableDraftLineItem()]);
        setNotesDraft("");
        return;
      }

      setError("");

      const { data: proformaData, error: proformaError } = await supabase
        .from("finance_proforma_invoices")
        .select(
          "id, proforma_number, client_id, client_po_id, quotation_id, company_id, issue_date, valid_until, status, currency_id, currency_code, total_amount, notes, project_id, task_id, payment_terms_id, shipping_term_id, bank_account_id, metadata"
        )
        .eq("id", proformaId)
        .maybeSingle();

      if (proformaError) throw proformaError;

      const typedProforma =
        (proformaData || null) as ProformaInvoiceSource | null;

      if (!typedProforma) {
        setError("Proforma invoice source was not found.");
        return;
      }

      if (!["issued", "confirmed"].includes(typedProforma.status)) {
        setError(
          "Proforma invoice must be issued or confirmed before linking."
        );
        return;
      }

      setSourceModeDraft("proforma_invoice");
      setSourceProformaIdDraft(typedProforma.id);
      setLinkedProforma(typedProforma);

      setClientIdDraft(
        typedProforma.client_id ? `client:${typedProforma.client_id}` : ""
      );
      setCompanyIdDraft(typedProforma.company_id || "");
      setProjectIdDraft(typedProforma.project_id || "");
      setTaskIdDraft(typedProforma.task_id || "");
      setPaymentTermsIdDraft(typedProforma.payment_terms_id || "");
      setShippingTermIdDraft(typedProforma.shipping_term_id || "");
      setBankAccountIdDraft(typedProforma.bank_account_id || "");
      setCurrencyIdDraft(typedProforma.currency_id || "");

      setIssueDateDraft(
        getDateInputValue(
          typedProforma.issue_date || new Date().toISOString()
        )
      );

      const dueDateBase = typedProforma.valid_until
        ? new Date(typedProforma.valid_until)
        : new Date();

      if (!typedProforma.valid_until) {
        dueDateBase.setDate(dueDateBase.getDate() + 30);
      }

      setDueDateDraft(dueDateBase.toISOString().slice(0, 10));

      setNotesDraft(
        [
          `Created from Proforma Invoice: ${
            typedProforma.proforma_number || typedProforma.id
          }`,
          typedProforma.notes || "",
        ]
          .filter(Boolean)
          .join("\n")
      );

      const { data: proformaLinesData, error: proformaLinesError } =
        await supabase
          .from("finance_proforma_invoice_line_items")
          .select(
            "id, proforma_invoice_id, item_id, description, quantity, unit_price, discount, sort_order, unit_of_measure_id, tax_code_id, revenue_category_id, project_id, task_id, status"
          )
          .eq("proforma_invoice_id", typedProforma.id)
          .or("status.is.null,status.neq.deleted")
          .order("sort_order", { ascending: true });

      if (proformaLinesError) throw proformaLinesError;

      const proformaLines =
        (proformaLinesData || []) as ProformaInvoiceLineSource[];

      setLineItemsDraft(
        proformaLines.length > 0
          ? proformaLines.map((line) => ({
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
                description: `Proforma Invoice ${
                  typedProforma.proforma_number || ""
                }`.trim(),
                quantity: "1",
                unit_price: String(toNumber(typedProforma.total_amount)),
                discount: "0",
                tax_code_id: "",
                unit_of_measure_id: "",
                revenue_category_id: "",
              },
            ]
      );
    },
    []
  );

  useEffect(() => {
    if (sourceModeDraft === "manual") {
      setSourceProformaIdDraft("");
      setLinkedProforma(null);
      setLineItemsDraft([createEditableDraftLineItem()]);
      setNotesDraft("");
    }
  }, [sourceModeDraft]);

  useEffect(() => {
    if (sourceModeDraft === "proforma_invoice" && sourceProformaIdDraft) {
      void applyProformaSource(sourceProformaIdDraft);
    }
  }, [sourceModeDraft, sourceProformaIdDraft, applyProformaSource]);

  const handleSaveDraftChanges = useCallback(async () => {
    if (!invoice) return;

    setIsSavingDraft(true);

    try {
      const counterpartyType = clientIdDraft.startsWith("company:")
        ? "company"
        : "client";

      const parsedClientId =
        counterpartyType === "client"
          ? clientIdDraft.replace("client:", "")
          : null;

      const parsedCounterpartyCompanyId =
        counterpartyType === "company"
          ? clientIdDraft.replace("company:", "")
          : null;

      await supabase
        .from("finance_invoices_issued")
        .update({
          client_id: parsedClientId || null,
          counterparty_type: counterpartyType,
          counterparty_company_id: parsedCounterpartyCompanyId,
          company_id: companyIdDraft || null,
          project_id: projectIdDraft || null,
          task_id: taskIdDraft || null,
          issue_date: issueDateDraft,
          due_date: dueDateDraft,
          notes: notesDraft,
          payment_terms_id: paymentTermsIdDraft || null,
          shipping_term_id: shippingTermIdDraft || null,
          bank_account_id: bankAccountIdDraft || null,
          currency_id: currencyIdDraft || null,
          proforma_invoice_id:
            sourceModeDraft === "proforma_invoice"
              ? sourceProformaIdDraft || null
              : null,
          metadata: {
            ...(invoice.metadata || {}),
            preferred_payment_method_id: paymentMethodIdDraft || null,
            source_mode: sourceModeDraft,
          },
          terms_and_conditions_snapshot: termsAndConditionsDraft,
        })
        .eq("id", invoice.id);

      await supabase
        .from("finance_invoice_issued_line_items")
        .delete()
        .eq("invoice_id", invoice.id);

      if (lineItemsDraft.length > 0) {
        await supabase.from("finance_invoice_issued_line_items").insert(
          lineItemsDraft.map((line, index) => ({
            invoice_id: invoice.id,
            item_id: line.item_id || null,
            description: line.description,
            quantity: Number(line.quantity || 0),
            unit_price: Number(line.unit_price || 0),
            discount: Number(line.discount || 0),
            tax_code_id: line.tax_code_id || null,
            unit_of_measure_id: line.unit_of_measure_id || null,
            revenue_category_id: line.revenue_category_id || null,
            sort_order: index,
          }))
        );
      }

      await loadInvoice(true);
    } catch (err) {
      console.error(err);
      setError("Failed to save draft changes.");
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    invoice,
    clientIdDraft,
    companyIdDraft,
    projectIdDraft,
    taskIdDraft,
    issueDateDraft,
    dueDateDraft,
    notesDraft,
    paymentTermsIdDraft,
    shippingTermIdDraft,
    bankAccountIdDraft,
    currencyIdDraft,
    sourceModeDraft,
    sourceProformaIdDraft,
    paymentMethodIdDraft,
    termsAndConditionsDraft,
    lineItemsDraft,
    loadInvoice,
  ]);

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

  const selectedDraftCurrency = useMemo(
    () => currencies.find((entry) => entry.id === currencyIdDraft) ?? null,
    [currencies, currencyIdDraft]
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

  const resolvedBankDetailsLines = useMemo(() => {
    if (!invoice) return [];
    if (invoice.status === "draft") {
      return buildBankDetailsLinesFromAccount(selectedDraftBankAccount);
    }
    return buildBankDetailsLinesFromSnapshot(invoice.bank_details_snapshot);
  }, [invoice, selectedDraftBankAccount]);

  const financialSummary = useMemo(() => {
    const subtotal = lineItemsDraft.reduce(
      (sum, row) => sum + toNumber(row.quantity) * toNumber(row.unit_price),
      0
    );

    const discount = lineItemsDraft.reduce(
      (sum, row) => sum + toNumber(row.discount),
      0
    );

    const tax = lineItemsDraft.reduce((sum, row) => {
      const base = Math.max(
        toNumber(row.quantity) * toNumber(row.unit_price) -
          toNumber(row.discount),
        0
      );
      const taxCode = taxCodes.find((taxCode) => taxCode.id === row.tax_code_id);
      if (!taxCode) return sum;
      return sum + base * (toNumber(taxCode.rate_percent) / 100);
    }, 0);

    const total = Math.max(subtotal - discount + tax, 0);
    const paid = toNumber(invoice?.paid_amount);
    const balance = total - paid;

    return {
      subtotal,
      discount,
      tax,
      total,
      paid,
      balance,
    };
  }, [invoice?.paid_amount, lineItemsDraft, taxCodes]);

  const currentCurrencyCode =
    selectedDraftCurrency?.currency_code || invoice?.currency_code || "USD";

  const displayState = invoice ? getInvoiceDisplayState(invoice as any) : null;

  const handleIssue = useCallback(async () => {
    if (!invoice || !id) return;

    setIsIssuing(true);
    setError("");

    try {
      await handleSaveDraftChanges();

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
  }, [handleSaveDraftChanges, id, invoice, loadInvoice]);

  const handleArchive = useCallback(async () => {
    if (!invoice || !id) return;

    setIsArchiving(true);
    setError("");

    try {
      const { error } = await supabase.rpc("finance_archive_invoice_issued", {
        p_invoice_id: id,
      });

      if (error) throw error;

      await loadInvoice(true);
      await loadArchiveItems();
      setShowArchivePopup(true);
    } catch (err) {
      console.error(err);
      setError("Failed to move invoice to archive.");
    } finally {
      setIsArchiving(false);
    }
  }, [id, invoice, loadArchiveItems, loadInvoice]);

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

  const handleRestore = useCallback(
    async (invoiceId: string) => {
      setIsDeleting(true);
      setError("");

      try {
        const { error } = await supabase.rpc("finance_restore_invoice_issued", {
          p_invoice_id: invoiceId,
        });

        if (error) throw error;

        if (invoiceId === id) {
          await loadInvoice(true);
        }

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
        const { error } = await supabase.rpc(
          "finance_hard_delete_invoice_issued",
          {
            p_invoice_id: invoiceId,
          }
        );

        if (error) throw error;

        if (invoiceId === id) {
          navigate("/finance/transactions/invoices");
          return;
        }

        await loadArchiveItems();
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to permanently delete invoice.");
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
    setLineItemsDraft((current) => [...current, createEditableDraftLineItem()]);
  }, []);

  const removeDraftLineItem = useCallback((lineId: string) => {
    setLineItemsDraft((current) => {
      const nextRows = current.filter((entry) => entry.id !== lineId);
      return nextRows.length > 0 ? nextRows : [createEditableDraftLineItem()];
    });
  }, []);

  const visibleArchiveItems = archiveItems.filter(
    (item) => item.status === archiveTab
  );

  const printableInvoice = useMemo(() => {
    if (!invoice) return invoice;

    return {
      ...invoice,
      company_name_snapshot:
        selectedDraftCompany?.legal_name ||
        selectedDraftCompany?.name ||
        invoice.company_name_snapshot,
      company_contact_person_snapshot:
        selectedDraftCompany?.contact_person ||
        invoice.company_contact_person_snapshot,
      company_address_snapshot:
        resolvedDraftCompanyAddress || invoice.company_address_snapshot,
      company_email_snapshot:
        selectedDraftCompany?.email || invoice.company_email_snapshot,
      company_phone_snapshot:
        selectedDraftCompany?.phone || invoice.company_phone_snapshot,
      counterparty_name_snapshot:
        resolvedDraftRecipientName ||
        invoice.counterparty_name_snapshot ||
        invoice.client_name_snapshot,
      client_name_snapshot:
        selectedDraftClient?.legal_name ||
        selectedDraftClient?.name ||
        invoice.client_name_snapshot,
      client_contact_person_snapshot:
        selectedDraftClient?.contact_person ||
        invoice.client_contact_person_snapshot,
      client_email_snapshot:
        selectedDraftClient?.company_email ||
        selectedDraftClient?.personnel_email ||
        invoice.client_email_snapshot,
      client_phone_snapshot:
        selectedDraftClient?.company_phone ||
        selectedDraftClient?.personnel_phone ||
        invoice.client_phone_snapshot,
      billing_address_snapshot:
        resolvedDraftRecipientAddress || invoice.billing_address_snapshot,
      payment_terms_snapshot:
        getPaymentTermLabel(selectedDraftPaymentTerm) !== "—"
          ? getPaymentTermLabel(selectedDraftPaymentTerm)
          : invoice.payment_terms_snapshot,
      shipping_terms_snapshot:
        getShippingTermLabel(selectedDraftShippingTerm) !== "—"
          ? getShippingTermLabel(selectedDraftShippingTerm)
          : invoice.shipping_terms_snapshot,
      terms_and_conditions_snapshot:
        termsAndConditionsDraft || invoice.terms_and_conditions_snapshot,
      bank_details_snapshot:
        buildBankDetailsSnapshotFromAccount(selectedDraftBankAccount) ||
        invoice.bank_details_snapshot,
      currency_code: currentCurrencyCode,
    };
  }, [
    currentCurrencyCode,
    invoice,
    resolvedDraftCompanyAddress,
    resolvedDraftRecipientAddress,
    resolvedDraftRecipientName,
    selectedDraftBankAccount,
    selectedDraftClient,
    selectedDraftCompany,
    selectedDraftPaymentTerm,
    selectedDraftShippingTerm,
    termsAndConditionsDraft,
  ]);

  const printableLineItems = lineItemsDraft.map((row) => {
    const qty = toNumber(row.quantity);
    const price = toNumber(row.unit_price);
    const discount = toNumber(row.discount);
    const taxRate =
      taxCodes.find((taxCode) => taxCode.id === row.tax_code_id)
        ?.rate_percent ?? 0;
    const base = Math.max(qty * price - discount, 0);

    return {
      id: row.id,
      description: row.description || "—",
      quantity: qty,
      unitPrice: price,
      discount,
      lineTotal: base + base * (toNumber(taxRate) / 100),
    };
  });

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
            Loading invoice...
          </div>
        </div>
      </div>
    );
  }

  if (!invoice || !displayState) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Invoice not found.
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
                onClick={() => navigate("/finance/transactions/invoices")}
                className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Invoices
              </button>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_620px]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                      Invoice Workspace
                    </Badge>

                    <Badge
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${getDocumentStatusBadgeClasses(
                        invoice.status
                      )}`}
                    >
                      {getIssuedInvoiceStatusLabel(invoice.status)}
                    </Badge>

                    <Badge
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${getPaymentStatusBadgeClasses(
                        invoice.payment_status
                      )}`}
                    >
                      {getIssuedInvoicePaymentStatusLabel(invoice.payment_status)}
                    </Badge>

                    <Badge
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${getPostingStatusBadgeClasses(
                        displayState.postingStatus
                      )}`}
                    >
                      {getPostingStatusLabel(displayState.postingStatus)}
                    </Badge>

                    {displayState.isOverdue ? (
                      <Badge
                        className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${getOverdueBadgeClasses()}`}
                      >
                        Overdue
                      </Badge>
                    ) : null}

                    {linkedProforma ? (
                      <Badge className="inline-flex w-fit rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200 shadow-none">
                        Linked PI
                      </Badge>
                    ) : null}
                  </div>

                  <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                    {invoice.invoice_number ||
                      (invoice.status === "draft"
                        ? "Draft Invoice"
                        : "Invoice")}
                  </h1>

                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                    Final outbound receivable document. Drafts are editable.
                    Issued invoices keep frozen commercial snapshots.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Recipient
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                      {resolvedDraftRecipientName ||
                        invoice.counterparty_name_snapshot ||
                        invoice.client_name_snapshot ||
                        "—"}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Recipient selected for this invoice.
                    </p>
                  </div>

                  <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Balance Due
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                      {formatFinanceMoney(
                        financialSummary.balance,
                        currentCurrencyCode
                      )}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Remaining amount after confirmed payments.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {invoice.status === "issued" ? (
                  <Button
                    onClick={() =>
                      navigate(
                        `/finance/transactions/payments-received/new?invoice_id=${invoice.id}`
                      )
                    }
                    className="h-11 rounded-2xl border border-emerald-400/20 bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm Payment
                  </Button>
                ) : null}

                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="h-11 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>

                {invoice.status === "draft" ? (
                  <Button
                    onClick={() => void handleIssue()}
                    disabled={isIssuing || isSavingDraft}
                    className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isIssuing ? "Issuing..." : "Issue Invoice"}
                  </Button>
                ) : null}

                {["draft", "issued", "partially_paid", "paid"].includes(
                  invoice.status
                ) ? (
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

                {invoice.status !== "deleted" && invoice.status !== "archived" ? (
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
            {[
              ["Subtotal", financialSummary.subtotal, "cyan"],
              ["Discount", financialSummary.discount, "amber"],
              ["Tax", financialSummary.tax, "violet"],
              ["Total", financialSummary.total, "emerald"],
            ].map(([label, value, tone]) => (
              <div
                key={String(label)}
                className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl"
              >
                <div className="relative">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {label}
                  </div>
                  <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-white">
                    {formatFinanceMoney(value as number, currentCurrencyCode)}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {tone === "emerald"
                      ? "Invoice value."
                      : "Calculated from invoice lines."}
                  </div>
                </div>
              </div>
            ))}
          </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            {/* LEFT COLUMN */}
            <div className="flex flex-col gap-6">

              {/* DOCUMENT OVERVIEW */}
              <Card className={sectionCardClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Document Overview</CardTitle>
                      <CardDescription>
                        Core document fields and source configuration
                      </CardDescription>
                    </div>

                    {invoice.status === "draft" && (
                      <Button
                        variant="outline"
                        onClick={() => setEditingOverview((p) => !p)}
                        className="h-9 rounded-xl border-white/10 bg-white/[0.05]"
                      >
                        <SquarePen className="h-4 w-4 mr-2" />
                        {editingOverview ? "Cancel" : "Edit"}
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-6">

                  {/* SOURCE MODE */}
                  {invoice.status === "draft" && editingOverview && (
                    <div className="grid md:grid-cols-2 gap-4">

                      <div>
                        <div className={eyebrowClass}>Source Mode</div>
                        <select
                          value={sourceModeDraft}
                          onChange={(e) =>
                            setSourceModeDraft(
                              e.target.value as "manual" | "proforma_invoice"
                            )
                          }
                          className={inputFieldClass}
                        >
                          <option value="manual">Manual</option>
                          <option value="proforma_invoice">
                            From Proforma Invoice
                          </option>
                        </select>
                      </div>

                      {sourceModeDraft === "proforma_invoice" && (
                        <div>
                          <div className={eyebrowClass}>
                            Select Proforma Invoice
                          </div>
                          <select
                            value={sourceProformaIdDraft}
                            onChange={(e) =>
                              setSourceProformaIdDraft(e.target.value)
                            }
                            className={inputFieldClass}
                          >
                            <option value="">Select PI</option>
                            {proformaSources.map((pi) => (
                              <option key={pi.id} value={pi.id}>
                                {pi.proforma_number} —{" "}
                                {formatFinanceMoney(
                                  pi.total_amount,
                                  pi.currency_code
                                )}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DATES + NOTES */}
                  <div className="grid md:grid-cols-3 gap-4">

                    <div>
                      <div className={eyebrowClass}>Issue Date</div>
                      {editingOverview ? (
                        <input
                          type="date"
                          value={issueDateDraft}
                          onChange={(e) =>
                            setIssueDateDraft(e.target.value)
                          }
                          className={inputFieldClass}
                        />
                      ) : (
                        <div className={readOnlyFieldClass}>
                          {formatFinanceDate(invoice.issue_date)}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className={eyebrowClass}>Due Date</div>
                      {editingOverview ? (
                        <input
                          type="date"
                          value={dueDateDraft}
                          onChange={(e) =>
                            setDueDateDraft(e.target.value)
                          }
                          className={inputFieldClass}
                        />
                      ) : (
                        <div className={readOnlyFieldClass}>
                          {formatFinanceDate(invoice.due_date)}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className={eyebrowClass}>Notes</div>
                      {editingOverview ? (
                        <input
                          value={notesDraft}
                          onChange={(e) =>
                            setNotesDraft(e.target.value)
                          }
                          className={inputFieldClass}
                        />
                      ) : (
                        <div className={readOnlyFieldClass}>
                          {invoice.notes || "—"}
                        </div>
                      )}
                    </div>

                  </div>

                </CardContent>
              </Card>


              {/* LINE ITEMS */}
              <Card className={sectionCardClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4 flex justify-between">
                  <CardTitle>Line Items</CardTitle>

                  {invoice.status === "draft" && (
                    <Button
                      variant="outline"
                      onClick={() => setEditingLines((p) => !p)}
                      className="h-9 rounded-xl border-white/10 bg-white/[0.05]"
                    >
                      <SquarePen className="h-4 w-4 mr-2" />
                      {editingLines ? "Cancel" : "Edit"}
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="p-5 space-y-3 max-h-[720px] overflow-y-auto">

                  {lineItemsDraft.map((line, i) => (
                    <div
                      key={line.id}
                      className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex justify-between mb-2 text-sm text-slate-400">
                        Line {i + 1}

                        {editingLines && (
                          <button onClick={() => removeDraftLineItem(line.id)}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="grid md:grid-cols-4 gap-3">
                        <input
                          value={line.description}
                          disabled={!editingLines}
                          onChange={(e) =>
                            setLineItemsDraft((prev) =>
                              prev.map((l) =>
                                l.id === line.id
                                  ? { ...l, description: e.target.value }
                                  : l
                              )
                            )
                          }
                          className={inputFieldClass}
                        />

                        <input
                          value={line.quantity}
                          disabled={!editingLines}
                          onChange={(e) =>
                            setLineItemsDraft((prev) =>
                              prev.map((l) =>
                                l.id === line.id
                                  ? { ...l, quantity: e.target.value }
                                  : l
                              )
                            )
                          }
                          className={inputFieldClass}
                        />

                        <input
                          value={line.unit_price}
                          disabled={!editingLines}
                          onChange={(e) =>
                            setLineItemsDraft((prev) =>
                              prev.map((l) =>
                                l.id === line.id
                                  ? { ...l, unit_price: e.target.value }
                                  : l
                              )
                            )
                          }
                          className={inputFieldClass}
                        />

                        <input
                          value={line.discount}
                          disabled={!editingLines}
                          onChange={(e) =>
                            setLineItemsDraft((prev) =>
                              prev.map((l) =>
                                l.id === line.id
                                  ? { ...l, discount: e.target.value }
                                  : l
                              )
                            )
                          }
                          className={inputFieldClass}
                        />
                      </div>
                    </div>
                  ))}

                  {editingLines && (
                    <button
                      onClick={addDraftLineItem}
                      className="text-cyan-300 text-sm"
                    >
                      + Add Line
                    </button>
                  )}

                </CardContent>
              </Card>

            </div>


            {/* RIGHT COLUMN */}
            <div className="flex flex-col gap-6">

              <Card className={sectionCardClass}>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>
                      {formatFinanceMoney(
                        financialSummary.subtotal,
                        currentCurrencyCode
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span>
                      {formatFinanceMoney(
                        financialSummary.discount,
                        currentCurrencyCode
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>
                      {formatFinanceMoney(
                        financialSummary.tax,
                        currentCurrencyCode
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-cyan-300 pt-2 border-t border-white/10">
                    <span>Total</span>
                    <span>
                      {formatFinanceMoney(
                        financialSummary.total,
                        currentCurrencyCode
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className={sectionCardClass}>
                <CardHeader>
                  <CardTitle>Payments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
                  {payments.length === 0 && (
                    <div className="text-slate-500 text-sm">
                      No payments
                    </div>
                  )}
                  {payments.map((p) => (
                    <div key={p.id} className="text-sm flex justify-between">
                      <span>
                        {formatFinanceMoney(p.amount, currentCurrencyCode)}
                      </span>
                      <span className="text-slate-400">
                        {formatFinanceDate(p.payment_date)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {invoice.status === "draft" && (
                <Button
                  onClick={() => void handleSaveDraftChanges()}
                  disabled={isSavingDraft}
                  className="h-11 rounded-2xl bg-cyan-500 text-black"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
              )}

            </div>
          </div>


          {/* PRINT */}
          <div style={{ display: "none" }}>
            <div id="invoice-print-root">
              <InvoicePrintDocument
                invoice={printableInvoice}
                lineItems={printableLineItems}
                financialSummary={financialSummary}
                currency={currentCurrencyCode}
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
