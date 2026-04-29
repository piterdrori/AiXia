import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Printer,
  Save,
  Trash2,
  SquarePen,
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

function getDocumentStatusBadgeClasses(status: InvoiceRecord["status"]) {
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

function getPaymentStatusBadgeClasses(status: InvoiceRecord["payment_status"]) {
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

  const [showArchivePopup, setShowArchivePopup] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">(
    "archived"
  );

  const [editingOverview, setEditingOverview] = useState(false);
  const [editingParties, setEditingParties] = useState(false);
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

        if (paymentsResult.error) {
          throw paymentsResult.error;
        }

        if (projectResult.error) {
          console.warn(
            "Failed to load linked project/task for invoice:",
            projectResult.error
          );
        }

        const typedInvoice = invoice as unknown as InvoiceRecord;
        const typedLineItems = (lineItems || []) as unknown as LineItemRow[];
        const typedPayments = (paymentsResult.data || []) as PaymentRow[];
        const linkedProject = (projectResult.data as any)?.project ?? null;
        const linkedTask = (projectResult.data as any)?.task ?? null;

              setInvoice(typedInvoice);
        setLineItems(typedLineItems);
        setPayments(typedPayments);
        setProject(linkedProject);
        setTask(linkedTask);

        setIssueDateDraft(typedInvoice.issue_date || "");
        setDueDateDraft(typedInvoice.due_date || "");
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
        supabase
          .from("projects")
          .select("id, name")
          .order("name", { ascending: true }),
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

  const selectedDraftShippingTermsLabel = useMemo(() => {
    if (!selectedDraftShippingTerm) return "";
    if (selectedDraftShippingTerm.description?.trim()) {
      return `${selectedDraftShippingTerm.name} — ${selectedDraftShippingTerm.description.trim()}`;
    }
    return selectedDraftShippingTerm.name || selectedDraftShippingTerm.code || "";
  }, [selectedDraftShippingTerm]);

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
    if (!projectIdDraft) {
      return tasks;
    }

    return tasks.filter((task) => task.project_id === projectIdDraft);
  }, [projectIdDraft, tasks]);

  const filteredDraftBankAccounts = useMemo(() => {
    if (!companyIdDraft) {
      return bankAccounts;
    }

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
    if (selectedDraftClient) {
      return buildClientAddress(selectedDraftClient);
    }

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
    () =>
      selectedDraftClient?.contact_person ||
      selectedDraftRecipientCompany?.contact_person ||
      "",
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

    return (
      invoice.client_email_snapshot ||
      invoice.counterparty_email_snapshot ||
      ""
    );
  }, [invoice]);

  const resolvedIssuedRecipientPhone = useMemo(() => {
    if (!invoice) return "";

    return (
      invoice.client_phone_snapshot ||
      invoice.counterparty_phone_snapshot ||
      ""
    );
  }, [invoice]);

  const resolvedIssuedRecipientContact = useMemo(() => {
    if (!invoice) return "";

    return (
      invoice.client_contact_person_snapshot ||
      invoice.counterparty_contact_person_snapshot ||
      ""
    );
  }, [invoice]);

  const resolvedBankDetailsLines = useMemo(() => {
    if (!invoice) return [];

    if (invoice.status === "draft") {
      return buildBankDetailsLinesFromAccount(selectedDraftBankAccount);
    }

    return buildBankDetailsLinesFromSnapshot(invoice.bank_details_snapshot);
  }, [invoice, selectedDraftBankAccount]);

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

      const taxCode = taxCodes.find((t) => t.id === row.tax_code_id);
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

  const financialSummary = useMemo(() => {
    if (!invoice || !totals) return null;

    if (invoice.status === "draft") {
      const paid = totals.paid;
      const balance = draftTotals.total - paid;

      return {
        subtotal: draftTotals.subtotal,
        discount: draftTotals.discount,
        tax: draftTotals.tax,
        total: draftTotals.total,
        paid,
        balance,
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

      if (matchedCurrency) {
        setCurrencyIdDraft(matchedCurrency.id);
      }
    }

    if (!dueDateDraft) {
      const days = selectedDraftClient.payment_terms_days ?? 14;
      const base = new Date(
        issueDateDraft || new Date().toISOString().slice(0, 10)
      );
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
        (currency) => currency.currency_code === selectedDraftCompany.currency_code
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
    invoice,
    selectedDraftCompany,
  ]);

  useEffect(() => {
    if (!invoice || invoice.status !== "draft") return;

    const taskStillValid = filteredDraftTasks.some(
      (entry) => entry.id === taskIdDraft
    );

    if (taskIdDraft && !taskStillValid) {
      setTaskIdDraft("");
    }
  }, [filteredDraftTasks, invoice, taskIdDraft]);

  const canEditDraft = invoice?.status === "draft";
  const canEditIssuedOverview = invoice?.status === "issued";
  const canEditIssuedParties = invoice?.status === "issued";
  const canArchive =
    !!invoice &&
    ["draft", "issued", "partially_paid", "paid"].includes(invoice.status);

  const handleIssue = useCallback(async () => {
    if (!invoice || !id) return;

    setIsIssuing(true);
    setError("");

    try {
      if (!lineItemsDraft.length) {
        setError("Invoice must have at least one line item.");
        setIsIssuing(false);
        return;
      }

      if (!clientIdDraft) {
        setError("Invoice must have a recipient.");
        setIsIssuing(false);
        return;
      }

      if (!selectedDraftBankAccount) {
        setError("Bank account is required before issuing.");
        setIsIssuing(false);
        return;
      }

      const selectedPaymentMethod = paymentMethods.find(
        (method) => method.id === paymentMethodIdDraft
      );

      const selectedCurrency = currencies.find(
        (currency) => currency.id === currencyIdDraft
      );

      const selectedPaymentTerm = paymentTerms.find(
        (term) => term.id === paymentTermsIdDraft
      );

      const selectedShippingTerm = shippingTerms.find(
        (term) => term.id === shippingTermIdDraft
      );

      const isCompany = clientIdDraft.startsWith("company:");
      const isClient = clientIdDraft.startsWith("client:");

      const resolvedClientId = isClient
        ? clientIdDraft.replace("client:", "")
        : null;

      const resolvedCompanyId = isCompany
        ? clientIdDraft.replace("company:", "")
        : null;

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
          currency_code:
            selectedCurrency?.currency_code || invoice.currency_code || "USD",
          issue_date: issueDateDraft,
          due_date: dueDateDraft,
          notes: notesDraft || null,
          company_name_snapshot:
            selectedDraftCompany?.legal_name ||
            selectedDraftCompany?.name ||
            null,
          company_contact_person_snapshot:
            selectedDraftCompany?.contact_person || null,
          company_address_snapshot: resolvedDraftCompanyAddress || null,
          company_email_snapshot: selectedDraftCompany?.email || null,
          company_phone_snapshot: selectedDraftCompany?.phone || null,
          counterparty_name_snapshot: resolvedDraftRecipientName || null,
          counterparty_legal_name_snapshot: resolvedDraftRecipientName || null,
          counterparty_contact_person_snapshot:
            resolvedDraftRecipientContact || null,
          counterparty_email_snapshot: resolvedDraftRecipientEmail || null,
          counterparty_phone_snapshot: resolvedDraftRecipientPhone || null,
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
          payment_terms_snapshot:
            selectedPaymentTerm?.document_label ||
            selectedPaymentTerm?.name ||
            null,
          shipping_terms_snapshot:
            selectedShippingTerm?.description?.trim()
              ? `${selectedShippingTerm.name} — ${selectedShippingTerm.description.trim()}`
              : selectedShippingTerm?.name || selectedShippingTerm?.code || null,
          terms_and_conditions_snapshot: termsAndConditionsDraft || null,
          bank_details_snapshot:
            buildBankDetailsSnapshotFromAccount(selectedDraftBankAccount),
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
            bank_address_snapshot:
              buildBankAddressFromAccount(selectedDraftBankAccount) || null,
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

      setEditingOverview(false);
      setEditingParties(false);
      setEditingLines(false);
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
        const { data: payments, error: paymentsError } = await supabase
          .from("finance_payments_received")
          .select("id")
          .eq("invoice_id", invoiceId)
          .eq("status", "confirmed");

        if (paymentsError) throw paymentsError;

        if (payments && payments.length > 0) {
          throw new Error("Cannot delete invoice with existing payments.");
        }

        const { error: invoiceError } = await supabase.rpc(
          "finance_hard_delete_invoice_issued",
          {
            p_invoice_id: invoiceId,
          }
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

  const handleSaveIssuedOverviewChanges = useCallback(async () => {
    if (!invoice || !id || invoice.status !== "issued") return;

    setIsSavingDraft(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

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
      setError(
        err?.message ||
          err?.details ||
          "Failed to save issued invoice overview changes."
      );
    } finally {
      setIsSavingDraft(false);
    }
  }, [id, invoice, issueDateDraft, dueDateDraft, notesDraft, loadInvoice]);

  const handleSaveIssuedPartiesChanges = useCallback(async () => {
    if (!invoice || !id || invoice.status !== "issued") return;

    setIsSavingDraft(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const { error: invoiceError } = await supabase
        .from("finance_invoices_issued")
        .update({
          terms_and_conditions_snapshot: termsAndConditionsDraft || null,
          updated_by: user.id,
        })
        .eq("id", id)
        .eq("status", "issued");

      if (invoiceError) throw invoiceError;

      setEditingParties(false);
      await loadInvoice(true);
    } catch (err) {
      console.error(err);
      setError("Failed to save issued invoice party details.");
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
      (row) =>
        row.description &&
        toNumber(row.quantity) > 0 &&
        toNumber(row.unit_price) >= 0
    );

    if (!hasAtLeastOneValidLine) {
      setError("Issued invoice must include at least one valid line item.");
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
        "Every issued invoice line must have a description, quantity greater than 0, and unit price 0 or higher."
      );
      setIsSavingDraft(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const existingIds = lineItems.map((entry) => entry.id);
      const draftIds = cleanedLineItems
        .filter((entry) => !entry.id.startsWith("new_"))
        .map((entry) => entry.id);

      const idsToDelete = existingIds.filter(
        (entryId) => !draftIds.includes(entryId)
      );

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
        {
          p_invoice_id: id,
        }
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
      (row) =>
        row.description &&
        toNumber(row.quantity) > 0 &&
        toNumber(row.unit_price) >= 0
    );

    if (!hasAtLeastOneValidLine) {
      setError("Draft invoice must include at least one valid line item.");
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
        "Every draft invoice line must have a description, quantity greater than 0, and unit price 0 or higher."
      );
      setIsSavingDraft(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const isCompany = clientIdDraft.startsWith("company:");
      const isClient = clientIdDraft.startsWith("client:");

      const resolvedClientId = isClient
        ? clientIdDraft.replace("client:", "")
        : null;

      const resolvedCompanyId = isCompany
        ? clientIdDraft.replace("company:", "")
        : null;

      const selectedPaymentMethod = paymentMethods.find(
        (method) => method.id === paymentMethodIdDraft
      );

      const selectedCurrency = currencies.find(
        (currency) => currency.id === currencyIdDraft
      );

      const selectedPaymentTerm = paymentTerms.find(
        (term) => term.id === paymentTermsIdDraft
      );

      const selectedShippingTerm = shippingTerms.find(
        (term) => term.id === shippingTermIdDraft
      );

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
          currency_code:
            selectedCurrency?.currency_code || invoice.currency_code || "USD",
          issue_date: issueDateDraft,
          due_date: dueDateDraft,
          notes: notesDraft || null,
          company_name_snapshot:
            selectedDraftCompany?.legal_name ||
            selectedDraftCompany?.name ||
            null,
          company_contact_person_snapshot:
            selectedDraftCompany?.contact_person || null,
          company_address_snapshot: resolvedDraftCompanyAddress || null,
          company_email_snapshot: selectedDraftCompany?.email || null,
          company_phone_snapshot: selectedDraftCompany?.phone || null,
          counterparty_name_snapshot: resolvedDraftRecipientName || null,
          counterparty_legal_name_snapshot: resolvedDraftRecipientName || null,
          counterparty_contact_person_snapshot:
            resolvedDraftRecipientContact || null,
          counterparty_email_snapshot: resolvedDraftRecipientEmail || null,
          counterparty_phone_snapshot: resolvedDraftRecipientPhone || null,
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
          payment_terms_snapshot:
            selectedPaymentTerm?.document_label ||
            selectedPaymentTerm?.name ||
            null,
          shipping_terms_snapshot:
            selectedShippingTerm?.description?.trim()
              ? `${selectedShippingTerm.name} — ${selectedShippingTerm.description.trim()}`
              : selectedShippingTerm?.name || selectedShippingTerm?.code || null,
          terms_and_conditions_snapshot: termsAndConditionsDraft || null,
          bank_details_snapshot:
            buildBankDetailsSnapshotFromAccount(selectedDraftBankAccount),
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
            bank_address_snapshot:
              buildBankAddressFromAccount(selectedDraftBankAccount) || null,
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
          },
        })
        .eq("id", id)
        .eq("status", "draft");

      if (invoiceError) throw invoiceError;

      const existingIds = lineItems.map((entry) => entry.id);
      const draftIds = cleanedLineItems
        .filter((entry) => !entry.id.startsWith("new_"))
        .map((entry) => entry.id);

      const idsToDelete = existingIds.filter(
        (entryId) => !draftIds.includes(entryId)
      );

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
        {
          p_invoice_id: id,
        }
      );

      if (recalcError) throw recalcError;

      setEditingOverview(false);
      setEditingParties(false);
      setEditingLines(false);
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
        (entry) =>
          entry.id === paymentTermsIdDraft ||
          entry.id === invoice.payment_terms_id
      ) ||
      null;

    const resolvedShippingTerms =
      selectedDraftShippingTermsLabel || invoice.shipping_terms_snapshot;

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
        terms_and_conditions_snapshot:
          termsAndConditionsDraft || invoice.terms_and_conditions_snapshot,
        currency_code: invoice.currency_code || "USD",
      };
    }

    const draftBankDetails =
      buildBankDetailsSnapshotFromAccount(selectedDraftBankAccount) ||
      invoice.bank_details_snapshot;

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
      payment_terms_snapshot: resolvedPaymentTermsLabel,
      payment_terms_document_text: resolvedPaymentTermsText,
      shipping_terms_snapshot: resolvedShippingTerms,
      terms_and_conditions_snapshot:
        termsAndConditionsDraft || invoice.terms_and_conditions_snapshot,
      bank_details_snapshot: draftBankDetails,
      currency_code:
        selectedDraftCurrency?.currency_code || invoice.currency_code || "USD",
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

  if (!invoice || !totals) {
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

  const displayState = getInvoiceDisplayState(invoice as any);

  const visibleArchiveItems = archiveItems.filter(
    (item) => item.status === archiveTab
  );

  const paymentProgressPercent = (() => {
    const total = Number(invoice.total_amount || 0);
    const paid = Number(invoice.paid_amount || 0);

    if (total <= 0) return 0;

    const percent = (paid / total) * 100;
    return Math.max(0, Math.min(percent, 100));
  })();

  const printableLineItems = lineItems.map((row) => ({
    id: row.id,
    description: row.description || "—",
    quantity: toNumber(row.quantity),
    unitPrice: toNumber(row.unit_price),
    discount: toNumber(row.discount),
    lineTotal: toNumber(row.line_total),
  }));

  const currentCurrencyCode =
    selectedDraftCurrency?.currency_code || invoice.currency_code || "USD";

  const sectionCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";

  const summaryBlockClass =
    "rounded-[24px] border border-white/10 bg-black/20 p-4";

  const labelClass = "text-[11px] uppercase tracking-[0.2em] text-slate-500";

  const inputLabelClass = "text-sm font-medium text-slate-300";

  const inputFieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";

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

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
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
                  </div>

                  <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                    {invoice.invoice_number ||
                      (invoice.status === "draft"
                        ? "Draft Invoice"
                        : "Invoice")}
                  </h1>

                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                    Final outbound receivable document issued by your company to
                    the recipient. Drafts remain editable; issued records keep
                    frozen commercial snapshots.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Recipient
                        </p>
                        <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                          {invoice.status === "draft"
                            ? resolvedDraftRecipientName || "—"
                            : resolvedIssuedRecipientName || "—"}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Recipient selected for this invoice.
                    </p>
                  </div>

                  <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Balance Due
                        </p>
                        <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                          {formatFinanceMoney(
                            financialSummary?.balance ?? 0,
                            currentCurrencyCode
                          )}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                      </div>
                    </div>
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

                {canArchive ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleArchive()}
                    disabled={isArchiving}
                    className="h-11 rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isArchiving ? "Archiving..." : "Archive"}
                  </Button>
                ) : null}

                {invoice.status !== "deleted" && invoice.status !== "archived" ? (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setIsDeleting(true);
                      setError("");

                      try {
                        const { error } = await supabase.rpc(
                          "finance_delete_invoice_issued",
                          { p_invoice_id: invoice.id }
                        );

                        if (error) throw error;

                        await loadInvoice(true);
                      } catch (err) {
                        console.error(err);
                        setError("Failed to delete invoice.");
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
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
            <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-transparent opacity-70" />
              <div className="relative">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Subtotal
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-cyan-100">
                  {formatFinanceMoney(
                    financialSummary?.subtotal ?? 0,
                    currentCurrencyCode
                  )}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-400">
                  Before discount and tax.
                </div>
              </div>
            </div>

            <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent opacity-70" />
              <div className="relative">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Discount
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-amber-100">
                  {formatFinanceMoney(
                    financialSummary?.discount ?? 0,
                    currentCurrencyCode
                  )}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-400">
                  Commercial discount.
                </div>
              </div>
            </div>

            <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/20 via-violet-400/10 to-transparent opacity-70" />
              <div className="relative">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Tax
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-violet-100">
                  {formatFinanceMoney(
                    financialSummary?.tax ?? 0,
                    currentCurrencyCode
                  )}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-400">
                  Based on selected tax codes.
                </div>
              </div>
            </div>

            <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-400/10 to-transparent opacity-70" />
              <div className="relative">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Total
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-emerald-100">
                  {formatFinanceMoney(
                    financialSummary?.total ?? 0,
                    currentCurrencyCode
                  )}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-400">
                  Invoice value.
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
            <div className="space-y-6">
              <Card className={sectionCardClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                        <SquarePen className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Document Overview
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs text-slate-500">
                          Commercial header, recipient, terms, bank, dates, currency, and references.
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingOverview ? (
                        <Button
                          onClick={() =>
                            canEditDraft
                              ? void handleSaveDraftChanges()
                              : void handleSaveIssuedOverviewChanges()
                          }
                          disabled={isSavingDraft}
                          className="h-9 rounded-2xl px-3"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingDraft ? "Saving..." : "Save"}
                        </Button>
                      ) : null}

                      {canEditDraft || canEditIssuedOverview ? (
                        <Button
                          variant="outline"
                          onClick={() =>
                            setEditingOverview((current) => !current)
                          }
                          className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                        >
                          <SquarePen className="mr-2 h-4 w-4" />
                          {editingOverview ? "Close" : "Edit"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                  {editingOverview && invoice.status === "draft" ? (
                    <>
                      <label className="space-y-2">
                        <div className={inputLabelClass}>Issuing Company</div>
                        <select
                          value={companyIdDraft}
                          onChange={(event) =>
                            setCompanyIdDraft(event.target.value)
                          }
                          className={inputFieldClass}
                        >
                          <option value="">Select company</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.legal_name || company.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <div className={inputLabelClass}>Recipient</div>
                        <select
                          value={clientIdDraft}
                          onChange={(event) =>
                            setClientIdDraft(event.target.value)
                          }
                          className={inputFieldClass}
                        >
                          <option value="">Select recipient</option>
                          <optgroup label="Clients">
                            {clients.map((client) => (
                              <option
                                key={client.id}
                                value={`client:${client.id}`}
                              >
                                {client.legal_name || client.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Companies (Intercompany)">
                            {companies
                              .filter((company) => company.id !== companyIdDraft)
                              .map((company) => (
                                <option
                                  key={company.id}
                                  value={`company:${company.id}`}
                                >
                                  {company.legal_name || company.name}
                                </option>
                              ))}
                          </optgroup>
                        </select>
                      </label>

                      <label className="space-y-2">
                        <div className={inputLabelClass}>Payment Terms</div>
                        <select
                          value={paymentTermsIdDraft}
                          onChange={(event) =>
                            setPaymentTermsIdDraft(event.target.value)
                          }
                          className={inputFieldClass}
                        >
                          <option value="">Select payment terms</option>
                          {paymentTerms.map((term) => (
                            <option key={term.id} value={term.id}>
                              {term.code} | {term.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <div className={inputLabelClass}>Shipping Terms</div>
                        <select
                          value={shippingTermIdDraft}
                          onChange={(event) =>
                            setShippingTermIdDraft(event.target.value)
                          }
                          className={inputFieldClass}
                        >
                          <option value="">Select shipping terms</option>
                          {shippingTerms.map((term) => (
                            <option key={term.id} value={term.id}>
                              {term.code} | {term.name}
                            </option>
                          ))}
                        </select>
                      </label>

                                            <label className="space-y-2">
                        <div className={inputLabelClass}>Bank Account</div>
                        <select
                          value={bankAccountIdDraft}
                          onChange={(event) =>
                            setBankAccountIdDraft(event.target.value)
                          }
                          className={inputFieldClass}
                        >
                          <option value="">Select bank account</option>
                          {filteredDraftBankAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <div className={inputLabelClass}>
                          Preferred Payment Method
                        </div>
                        <select
                          value={paymentMethodIdDraft}
                          onChange={(event) =>
                            setPaymentMethodIdDraft(event.target.value)
                          }
                          className={inputFieldClass}
                        >
                          <option value="">Select payment method</option>
                          {paymentMethods.map((method) => (
                            <option key={method.id} value={method.id}>
                              {method.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <div className={inputLabelClass}>Issue Date</div>
                        <input
                          type="date"
                          value={issueDateDraft}
                          onChange={(event) =>
                            setIssueDateDraft(event.target.value)
                          }
                          className={inputFieldClass}
                        />
                      </label>

                      <label className="space-y-2">
                        <div className={inputLabelClass}>Due Date</div>
                        <input
                          type="date"
                          value={dueDateDraft}
                          onChange={(event) =>
                            setDueDateDraft(event.target.value)
                          }
                          className={inputFieldClass}
                        />
                      </label>

                      <label className="space-y-2">
                        <div className={inputLabelClass}>Currency</div>
                        <select
                          value={currencyIdDraft}
                          onChange={(event) =>
                            setCurrencyIdDraft(event.target.value)
                          }
                          className={inputFieldClass}
                        >
                          <option value="">Select currency</option>
                          {currencies.map((currency) => (
                            <option key={currency.id} value={currency.id}>
                              {currency.currency_code} — {currency.currency_name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <div className={inputLabelClass}>Project</div>
                        <select
                          value={projectIdDraft}
                          onChange={(event) =>
                            setProjectIdDraft(event.target.value)
                          }
                          className={inputFieldClass}
                        >
                          <option value="">No project</option>
                          {projects.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <div className={inputLabelClass}>Task</div>
                        <select
                          value={taskIdDraft}
                          onChange={(event) =>
                            setTaskIdDraft(event.target.value)
                          }
                          className={inputFieldClass}
                        >
                          <option value="">No task</option>
                          {filteredDraftTasks.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.title}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                        <div className={labelClass}>Posted To Ledger</div>
                        <div className="mt-2 text-sm font-semibold text-white">
                          {invoice.posted_to_ledger ? "Posted" : "Not Posted"}
                        </div>
                      </div>

                      <div className="md:col-span-3">
                        <div className={inputLabelClass}>Notes</div>
                        <textarea
                          value={notesDraft}
                          onChange={(event) =>
                            setNotesDraft(event.target.value)
                          }
                          rows={4}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                        />
                      </div>
                    </>
                  ) : editingOverview && invoice.status === "issued" ? (
                    <>
                      <label className="space-y-2">
                        <div className={inputLabelClass}>Issue Date</div>
                        <input
                          type="date"
                          value={issueDateDraft}
                          onChange={(event) =>
                            setIssueDateDraft(event.target.value)
                          }
                          className={inputFieldClass}
                        />
                      </label>

                      <label className="space-y-2">
                        <div className={inputLabelClass}>Due Date</div>
                        <input
                          type="date"
                          value={dueDateDraft}
                          onChange={(event) =>
                            setDueDateDraft(event.target.value)
                          }
                          className={inputFieldClass}
                        />
                      </label>

                      <div className="md:col-span-3">
                        <div className={inputLabelClass}>Notes</div>
                        <textarea
                          value={notesDraft}
                          onChange={(event) =>
                            setNotesDraft(event.target.value)
                          }
                          rows={4}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Issuing Company</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {invoice.status === "draft"
                            ? selectedDraftCompany?.legal_name ||
                              selectedDraftCompany?.name ||
                              "—"
                            : invoice.company_name_snapshot || "—"}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">
                          {invoice.status === "draft" ? (
                            <>
                              {resolvedDraftCompanyAddress ? (
                                <div>{resolvedDraftCompanyAddress}</div>
                              ) : null}
                              {selectedDraftCompany?.email ? (
                                <div>Email: {selectedDraftCompany.email}</div>
                              ) : null}
                              {selectedDraftCompany?.phone ? (
                                <div>Phone: {selectedDraftCompany.phone}</div>
                              ) : null}
                            </>
                          ) : (
                            <>
                              {invoice.company_address_snapshot ? (
                                <div>{invoice.company_address_snapshot}</div>
                              ) : null}
                              {invoice.company_email_snapshot ? (
                                <div>Email: {invoice.company_email_snapshot}</div>
                              ) : null}
                              {invoice.company_phone_snapshot ? (
                                <div>Phone: {invoice.company_phone_snapshot}</div>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Recipient</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {invoice.status === "draft"
                            ? resolvedDraftRecipientName || "—"
                            : resolvedIssuedRecipientName || "—"}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">
                          {invoice.status === "draft" ? (
                            <>
                              {resolvedDraftRecipientAddress ? (
                                <div>{resolvedDraftRecipientAddress}</div>
                              ) : null}
                              {resolvedDraftRecipientContact ? (
                                <div>Contact: {resolvedDraftRecipientContact}</div>
                              ) : null}
                              {resolvedDraftRecipientEmail ? (
                                <div>Email: {resolvedDraftRecipientEmail}</div>
                              ) : null}
                              {resolvedDraftRecipientPhone ? (
                                <div>Phone: {resolvedDraftRecipientPhone}</div>
                              ) : null}
                            </>
                          ) : (
                            <>
                              {invoice.billing_address_snapshot ? (
                                <div>{invoice.billing_address_snapshot}</div>
                              ) : null}
                              {resolvedIssuedRecipientContact ? (
                                <div>Contact: {resolvedIssuedRecipientContact}</div>
                              ) : null}
                              {resolvedIssuedRecipientEmail ? (
                                <div>Email: {resolvedIssuedRecipientEmail}</div>
                              ) : null}
                              {resolvedIssuedRecipientPhone ? (
                                <div>Phone: {resolvedIssuedRecipientPhone}</div>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Payment Terms</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {invoice.status === "draft"
                            ? selectedDraftPaymentTerm?.name || "—"
                            : invoice.payment_terms_snapshot || "—"}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">
                          {invoice.status === "draft" &&
                          selectedDraftPaymentTerm
                            ? `${selectedDraftPaymentTerm.code} · Due in ${selectedDraftPaymentTerm.due_days} days`
                            : ""}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Shipping Terms</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {invoice.status === "draft"
                            ? selectedDraftShippingTermsLabel || "—"
                            : invoice.shipping_terms_snapshot || "—"}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Bank Account</div>
                        <div className="mt-2 space-y-1 text-sm leading-6 text-slate-300">
                          {resolvedBankDetailsLines.length > 0 ? (
                            resolvedBankDetailsLines.map((line, index) => (
                              <div key={`${line}-${index}`}>{line}</div>
                            ))
                          ) : (
                            <div>—</div>
                          )}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>
                          Preferred Payment Method
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {invoice.status === "draft"
                            ? selectedDraftPaymentMethod?.name || "—"
                            : ((invoice.metadata
                                ?.preferred_payment_method_name as string) ||
                                ((invoice.metadata
                                  ?.preferred_payment_method_id as string) &&
                                  paymentMethods.find(
                                    (method) =>
                                      method.id ===
                                      (invoice.metadata
                                        ?.preferred_payment_method_id as string)
                                  )?.name) ||
                                "—")}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Issue Date</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {invoice.status === "draft"
                            ? formatFinanceDate(issueDateDraft)
                            : formatFinanceDate(invoice.issue_date)}
                        </div>
                      </div>

                                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Due Date</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {invoice.status === "draft"
                            ? formatFinanceDate(dueDateDraft)
                            : formatFinanceDate(invoice.due_date)}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Currency</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {invoice.status === "draft"
                            ? selectedDraftCurrency
                              ? `${selectedDraftCurrency.currency_code} — ${selectedDraftCurrency.currency_name}`
                              : invoice.currency_code || "USD"
                            : invoice.currency_code || "USD"}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Project</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {invoice.status === "draft"
                            ? selectedDraftProject?.name || "—"
                            : project?.name || "—"}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Task</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {invoice.status === "draft"
                            ? selectedDraftTask?.title || "—"
                            : task?.title || "—"}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Posted To Ledger</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {invoice.posted_to_ledger ? "Posted" : "Not Posted"}
                        </div>
                      </div>

                      <div className={`${summaryBlockClass} md:col-span-3`}>
                        <div className={labelClass}>Notes</div>
                        <div className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
                          {invoice.status === "draft"
                            ? notesDraft || "—"
                            : invoice.notes || "—"}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className={sectionCardClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Terms &amp; Conditions
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Payment terms, shipping terms, and document terms.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingParties ? (
                        <Button
                          onClick={() =>
                            invoice.status === "draft"
                              ? void handleSaveDraftChanges()
                              : void handleSaveIssuedPartiesChanges()
                          }
                          disabled={isSavingDraft}
                          className="h-9 rounded-2xl px-3"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingDraft ? "Saving..." : "Save"}
                        </Button>
                      ) : null}

                      {canEditDraft || canEditIssuedParties ? (
                        <Button
                          variant="outline"
                          onClick={() => setEditingParties((current) => !current)}
                          className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                        >
                          <SquarePen className="mr-2 h-4 w-4" />
                          {editingParties ? "Close" : "Edit"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Payment Terms</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {invoice.status === "draft"
                        ? selectedDraftPaymentTerm?.name || "—"
                        : invoice.payment_terms_snapshot || "—"}
                    </div>
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Shipping Terms</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {invoice.status === "draft"
                        ? selectedDraftShippingTermsLabel || "—"
                        : invoice.shipping_terms_snapshot || "—"}
                    </div>
                  </div>

                  <div className={`${summaryBlockClass} md:col-span-2`}>
                    <div className={labelClass}>Terms and Conditions</div>
                    {editingParties ? (
                      <textarea
                        value={termsAndConditionsDraft}
                        onChange={(event) =>
                          setTermsAndConditionsDraft(event.target.value)
                        }
                        rows={7}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                      />
                    ) : (
                      <div className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
                        {termsAndConditionsDraft ||
                          invoice.terms_and_conditions_snapshot ||
                          "—"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={sectionCardClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Line Items
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Products and services on this invoice.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingLines ? (
                        <Button
                          onClick={() =>
                            canEditDraft
                              ? void handleSaveDraftChanges()
                              : void handleSaveIssuedLineChanges()
                          }
                          disabled={isSavingDraft}
                          className="h-9 rounded-2xl px-3"
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

                      {canEditDraft || invoice.status === "issued" ? (
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
                  </div>
                </CardHeader>

                <CardContent className="p-5">
                  <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
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
                      const rowTaxCodeId = editable
                        ? editableRow.tax_code_id
                        : readOnlyRow.tax_code_id || "";
                      const rowTaxRate =
                        taxCodes.find((taxCode) => taxCode.id === rowTaxCodeId)
                          ?.rate_percent ?? 0;
                      const rowBase = Math.max(
                        rowQuantity * rowUnitPrice - rowDiscount,
                        0
                      );
                      const rowTotal = editable
                        ? rowBase + rowBase * (toNumber(rowTaxRate) / 100)
                        : toNumber(readOnlyRow.line_total);

                      return (
                        <div
                          key={(row as EditableLineItem | LineItemRow).id}
                          className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                        >
                          <div className="mb-4 flex items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-white">
                                Line {index + 1}
                              </div>
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
                              <div className={inputLabelClass}>Item</div>
                              {editable ? (
                                <select
                                  value={editableRow.item_id}
                                  onChange={(event) =>
                                    applyDraftItemSelection(
                                      editableRow.id,
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
                                <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-300">
                                  {items.find(
                                    (item) => item.id === readOnlyRow.item_id
                                  )?.name || "—"}
                                </div>
                              )}
                            </label>

                            <label className="space-y-2 md:col-span-4">
                              <div className={inputLabelClass}>Description</div>
                              {editable ? (
                                <input
                                  value={editableRow.description}
                                  onChange={(event) =>
                                    setLineItemsDraft((draft) =>
                                      draft.map((entry) =>
                                        entry.id === editableRow.id
                                          ? {
                                              ...entry,
                                              description: event.target.value,
                                            }
                                          : entry
                                      )
                                    )
                                  }
                                  className={inputFieldClass}
                                  placeholder="Description"
                                />
                              ) : (
                                <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-300">
                                  {readOnlyRow.description || "—"}
                                </div>
                              )}
                            </label>

                            <label className="space-y-2 md:col-span-1">
                              <div className={inputLabelClass}>Qty</div>
                              {editable ? (
                                <input
                                  value={editableRow.quantity}
                                  onChange={(event) =>
                                    setLineItemsDraft((draft) =>
                                      draft.map((entry) =>
                                        entry.id === editableRow.id
                                          ? { ...entry, quantity: event.target.value }
                                          : entry
                                      )
                                    )
                                  }
                                  className={inputFieldClass}
                                />
                              ) : (
                                <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-300">
                                  {rowQuantity}
                                </div>
                              )}
                            </label>

                            <label className="space-y-2 md:col-span-2">
                              <div className={inputLabelClass}>Unit</div>
                              {editable ? (
                                <select
                                  value={editableRow.unit_of_measure_id}
                                  onChange={(event) =>
                                    setLineItemsDraft((draft) =>
                                      draft.map((entry) =>
                                        entry.id === editableRow.id
                                          ? {
                                              ...entry,
                                              unit_of_measure_id:
                                                event.target.value,
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
                                <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-300">
                                  {unitsOfMeasure.find(
                                    (unit) =>
                                      unit.id === readOnlyRow.unit_of_measure_id
                                  )?.name || "—"}
                                </div>
                              )}
                            </label>

                            <label className="space-y-2 md:col-span-2">
                              <div className={inputLabelClass}>Unit Price</div>
                              {editable ? (
                                <input
                                  value={editableRow.unit_price}
                                  onChange={(event) =>
                                    setLineItemsDraft((draft) =>
                                      draft.map((entry) =>
                                        entry.id === editableRow.id
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
                                <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-300">
                                  {formatFinanceMoney(
                                    rowUnitPrice,
                                    currentCurrencyCode
                                  )}
                                </div>
                              )}
                            </label>

                            <label className="space-y-2 md:col-span-2">
                              <div className={inputLabelClass}>Discount</div>
                              {editable ? (
                                <input
                                  value={editableRow.discount}
                                  onChange={(event) =>
                                    setLineItemsDraft((draft) =>
                                      draft.map((entry) =>
                                        entry.id === editableRow.id
                                          ? { ...entry, discount: event.target.value }
                                          : entry
                                      )
                                    )
                                  }
                                  className={inputFieldClass}
                                />
                              ) : (
                                <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-300">
                                  {formatFinanceMoney(
                                    rowDiscount,
                                    currentCurrencyCode
                                  )}
                                </div>
                              )}
                            </label>

                            <label className="space-y-2 md:col-span-2">
                              <div className={inputLabelClass}>Tax Code</div>
                              {editable ? (
                                <select
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
                                <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-300">
                                  {taxCodes.find(
                                    (taxCode) =>
                                      taxCode.id === readOnlyRow.tax_code_id
                                  )?.name || "—"}
                                </div>
                              )}
                            </label>

                            <label className="space-y-2 md:col-span-3">
                              <div className={inputLabelClass}>
                                Revenue Category
                              </div>
                              {editable ? (
                                <select
                                  value={editableRow.revenue_category_id}
                                  onChange={(event) =>
                                    setLineItemsDraft((draft) =>
                                      draft.map((entry) =>
                                        entry.id === editableRow.id
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
                                <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-300">
                                  {revenueCategories.find(
                                    (category) =>
                                      category.id ===
                                      readOnlyRow.revenue_category_id
                                  )?.name || "—"}
                                </div>
                              )}
                            </label>

                            <div className="space-y-2 md:col-span-3">
                              <div className={inputLabelClass}>Line Total</div>
                              <div className="flex min-h-[44px] items-center rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100">
                                {formatFinanceMoney(rowTotal, currentCurrencyCode)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                    Live totals, collection state, and remaining balance.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Subtotal</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.subtotal ?? 0,
                        currentCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Discount</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.discount ?? 0,
                        currentCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Tax</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.tax ?? 0,
                        currentCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">
                      Total
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.total ?? 0,
                        currentCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Paid</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.paid ?? 0,
                        currentCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-amber-400/15 bg-amber-500/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-amber-100/70">
                      Balance Due
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.balance ?? 0,
                        currentCurrencyCode
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={sectionCardClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Payment History
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-slate-500">
                    Confirmed payments linked to this invoice.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 p-5">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>Total</span>
                      <span>
                        {formatFinanceMoney(
                          toNumber(invoice.total_amount),
                          currentCurrencyCode
                        )}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-sm text-emerald-300">
                      <span>Paid</span>
                      <span>
                        {formatFinanceMoney(
                          toNumber(invoice.paid_amount),
                          currentCurrencyCode
                        )}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-sm text-amber-300">
                      <span>Remaining</span>
                      <span>
                        {formatFinanceMoney(
                          toNumber(invoice.balance_due),
                          currentCurrencyCode
                        )}
                      </span>
                    </div>

                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${paymentProgressPercent}%` }}
                      />
                    </div>
                  </div>

                  {payments.length === 0 ? (
                    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-slate-500">
                      No payments yet.
                    </div>
                  ) : (
                    <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          onClick={() =>
                            navigate(
                              `/finance/transactions/payments-received/${payment.id}`
                            )
                          }
                          className="cursor-pointer rounded-[20px] border border-white/10 bg-black/20 p-4 transition hover:bg-white/[0.04]"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="text-sm font-medium text-white">
                                {payment.reference_number || payment.id}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {formatFinanceDate(payment.payment_date)}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-sm font-semibold text-white">
                                {formatFinanceMoney(
                                  toNumber(payment.amount),
                                  payment.payment_currency_code ||
                                    currentCurrencyCode
                                )}
                              </div>
                              <Badge className="mt-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 text-[10px] text-emerald-300 shadow-none">
                                {payment.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={sectionCardClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Archive
                    </CardTitle>
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
                  <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-400">
                    Archive moves the invoice to archived. Delete moves the
                    invoice to deleted. Hard delete is available only from the
                    deleted tab.
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
                          No {archiveTab} invoices.
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
                                    {item.invoice_number || "Invoice"}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {item.counterparty_name_snapshot ||
                                      item.client_name_snapshot ||
                                      "—"}{" "}
                                    • {formatFinanceDate(item.updated_at || null)}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="text-sm text-slate-400">
                                    {formatFinanceMoney(
                                      toNumber(item.total_amount),
                                      currentCurrencyCode
                                    )}
                                  </div>

                                  <Button
                                    variant="outline"
                                    onClick={() => void handleRestore(item.id)}
                                    disabled={isDeleting}
                                    className="h-9 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-3 text-emerald-200 hover:bg-emerald-500/20"
                                  >
                                    Restore
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
            </div>
          </div>

          {error ? (
            <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      <InvoicePrintDocument
        invoice={printableInvoice}
        lineItems={printableLineItems}
        financialSummary={financialSummary}
      />
    </>
  );
}
