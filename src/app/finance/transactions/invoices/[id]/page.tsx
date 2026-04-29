import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  FileText,
  Link2,
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
  const [editingFinancialSettings, setEditingFinancialSettings] =
    useState(false);
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

        // ----- DRAFT STATE SYNC -----
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
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id, loadArchiveItems]
  );

  // INITIAL LOAD
  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  // MASTER DATA LOAD
  useEffect(() => {
    const loadMasterData = async () => {
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
        unitsResult,
        revenueCategoriesResult,
      ] = await Promise.all([
        supabase.from("clients").select("*").eq("is_active", true),
        supabase.from("finance_companies").select("*").eq("is_active", true),
        supabase.from("projects").select("id, name"),
        supabase.from("tasks").select("id, title, project_id"),
        supabase.from("finance_payment_terms").select("*"),
        supabase.from("finance_shipping_terms").select("*"),
        supabase.from("finance_bank_accounts").select("*"),
        supabase.from("finance_currencies").select("*"),
        supabase.from("finance_payment_methods").select("*"),
        supabase.from("items").select("*"),
        supabase.from("finance_tax_codes").select("*"),
        supabase.from("finance_units_of_measure").select("*"),
        supabase.from("finance_revenue_categories").select("*"),
      ]);

      setClients((clientsResult.data || []) as ClientOption[]);
      setCompanies((companiesResult.data || []) as CompanyOption[]);
      setProjects((projectsResult.data || []) as ProjectRow[]);
      setTasks((tasksResult.data || []) as TaskRow[]);
      setPaymentTerms(
        (paymentTermsResult.data || []) as PaymentTermOption[]
      );
      setShippingTerms(
        (shippingTermsResult.data || []) as ShippingTermOption[]
      );
      setBankAccounts(
        (bankAccountsResult.data || []) as BankAccountOption[]
      );
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
      setPaymentMethods(
        (paymentMethodsResult.data || []) as PaymentMethodOption[]
      );
      setItems((itemsResult.data || []) as ItemOption[]);
      setTaxCodes((taxCodesResult.data || []) as TaxCodeOption[]);
      setUnitsOfMeasure(
        (unitsResult.data || []) as UnitOfMeasureOption[]
      );
      setRevenueCategories(
        (revenueCategoriesResult.data || []) as RevenueCategoryOption[]
      );
    };

    loadMasterData();
  }, []);

  // ===== DERIVED =====

  const isDraft = invoice?.status === "draft";

  const currencyCode =
    invoice?.currency_code ||
    currencies.find((c) => c.id === invoice?.currency_id)?.currency_code ||
    "USD";

  const financialSummary = useMemo(() => {
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

  const selectedClient = useMemo(() => {
    if (!clientIdDraft) return null;

    if (clientIdDraft.startsWith("client:")) {
      const id = clientIdDraft.replace("client:", "");
      return clients.find((c) => c.id === id) || null;
    }

    return null;
  }, [clientIdDraft, clients]);

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === companyIdDraft) || null;
  }, [companyIdDraft, companies]);

  const selectedBank = useMemo(() => {
    return bankAccounts.find((b) => b.id === bankAccountIdDraft) || null;
  }, [bankAccountIdDraft, bankAccounts]);

  const selectedPaymentTerm = useMemo(() => {
    return paymentTerms.find((p) => p.id === paymentTermsIdDraft) || null;
  }, [paymentTermsIdDraft, paymentTerms]);

  const selectedShippingTerm = useMemo(() => {
    return shippingTerms.find((s) => s.id === shippingTermIdDraft) || null;
  }, [shippingTermIdDraft, shippingTerms]);

  const selectedCurrency = useMemo(() => {
    return currencies.find((c) => c.id === currencyIdDraft) || null;
  }, [currencyIdDraft, currencies]);

  const isOverdue = useMemo(() => {
    if (!invoice?.due_date) return false;
    if (invoice.payment_status === "paid") return false;

    return new Date(invoice.due_date) < new Date();
  }, [invoice]);

  // ===== LINE LOGIC =====

  const handleAddLine = () => {
    setLineItemsDraft((prev) => [...prev, createEditableDraftLineItem()]);
  };

  const handleRemoveLine = (id: string) => {
    setLineItemsDraft((prev) => prev.filter((l) => l.id !== id));
  };

  const handleLineChange = (
    id: string,
    field: keyof EditableLineItem,
    value: string
  ) => {
    setLineItemsDraft((prev) =>
      prev.map((line) =>
        line.id === id ? { ...line, [field]: value } : line
      )
    );
  };

  // ===== SAVE =====

  const handleSaveDraft = async () => {
    if (!invoice) return;

    setIsSavingDraft(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("finance_invoices_issued")
        .update({
          issue_date: issueDateDraft,
          due_date: dueDateDraft,
          notes: notesDraft,
          payment_terms_id: paymentTermsIdDraft || null,
          shipping_term_id: shippingTermIdDraft || null,
          bank_account_id: bankAccountIdDraft || null,
          currency_id: currencyIdDraft || null,
          terms_and_conditions_snapshot: termsAndConditionsDraft,
          metadata: {
            ...(invoice.metadata || {}),
            preferred_payment_method_id: paymentMethodIdDraft || null,
          },
        })
        .eq("id", invoice.id);

      if (updateError) throw updateError;

      // RESET LINE ITEMS (STRICT SOURCE OF TRUTH)
      await supabase
        .from("finance_invoice_line_items")
        .delete()
        .eq("invoice_issued_id", invoice.id);

      const rowsToInsert = lineItemsDraft.map((l, index) => ({
        invoice_issued_id: invoice.id,
        item_id: l.item_id || null,
        description: l.description,
        quantity: Number(l.quantity || 0),
        unit_price: Number(l.unit_price || 0),
        discount: Number(l.discount || 0),
        tax_code_id: l.tax_code_id || null,
        unit_of_measure_id: l.unit_of_measure_id || null,
        revenue_category_id: l.revenue_category_id || null,
        sort_order: index,
      }));

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("finance_invoice_line_items")
          .insert(rowsToInsert);

        if (insertError) throw insertError;
      }

      await loadInvoice(true);
      closeAllEditors();
    } catch (err) {
      console.error(err);
      setError("Failed to save draft.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // ===== ISSUE =====

  const handleIssueInvoice = async () => {
    if (!invoice) return;

    setIsIssuing(true);
    setError("");

    try {
      const { error } = await supabase.rpc(
        "finance_issue_invoice_issued",
        {
          p_invoice_id: invoice.id,
        }
      );

      if (error) throw error;

      await loadInvoice(true);
    } catch (err) {
      console.error(err);
      setError("Failed to issue invoice.");
    } finally {
      setIsIssuing(false);
    }
  };

  // ===== ARCHIVE / DELETE =====

  const handleArchive = async () => {
    if (!invoice) return;

    setIsArchiving(true);

    try {
      const { error } = await supabase.rpc(
        "finance_archive_invoice_issued",
        {
          p_invoice_id: invoice.id,
        }
      );

      if (error) throw error;

      navigate("/finance/transactions/invoices");
    } catch (err) {
      console.error(err);
      setError("Failed to archive invoice.");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase.rpc(
        "finance_delete_invoice_issued",
        {
          p_invoice_id: invoice.id,
        }
      );

      if (error) throw error;

      navigate("/finance/transactions/invoices");
    } catch (err) {
      console.error(err);
      setError("Failed to delete invoice.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ===== LOADING =====

  if (isLoading || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        Loading invoice...
      </div>
    );
  }

  const displayState = getInvoiceDisplayState(invoice);

  // ===== RENDER START =====

  return (

          <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">

          {/* HERO */}
          <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl">
            <div className="pointer-events-none absolute -top-32 left-0 h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 right-0 h-[300px] w-[300px] rounded-full bg-violet-500/10 blur-3xl" />

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div className="space-y-2">
                <Badge className="w-fit rounded-full border border-white/10 bg-white/[0.05] px-4 py-1 text-[11px] uppercase tracking-[0.22em]">
                  Invoice
                </Badge>

                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {invoice.invoice_number}
                  </h1>

                  <Badge
                    className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${getDocumentStatusBadgeClasses(
                      invoice.status
                    )}`}
                  >
                    {getIssuedInvoiceStatusLabel(invoice.status)}
                  </Badge>

                  <Badge
                    className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${getPaymentStatusBadgeClasses(
                      invoice.payment_status
                    )}`}
                  >
                    {getIssuedInvoicePaymentStatusLabel(
                      invoice.payment_status
                    )}
                  </Badge>

                  {isOverdue && (
                    <Badge
                      className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${getOverdueBadgeClasses()}`}
                    >
                      Overdue
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-slate-400">
                  Full invoice lifecycle, financials, and linked flows.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">

                {isDraft && (
                  <Button
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className="rounded-2xl bg-white text-black hover:bg-white/90"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                )}

                {isDraft && (
                  <Button
                    onClick={handleIssueInvoice}
                    disabled={isIssuing}
                    className="rounded-2xl bg-cyan-500 text-black hover:bg-cyan-400"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Issue
                  </Button>
                )}

                <Button
                  onClick={handlePrint}
                  variant="secondary"
                  className="rounded-2xl"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>

                <Button
                  onClick={handleArchive}
                  disabled={isArchiving}
                  variant="secondary"
                  className="rounded-2xl"
                >
                  Archive
                </Button>

                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  variant="destructive"
                  className="rounded-2xl"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>

              </div>
            </div>
          </div>

          {/* GRID */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* LEFT */}
            <div className="flex flex-col gap-6 lg:col-span-2">

              {/* DOCUMENT OVERVIEW */}
              <Card className="rounded-[30px] border border-white/10 bg-white/[0.045]">
                <CardHeader className="flex flex-row items-center justify-between px-5 py-4">
                  <div>
                    <CardTitle>Document Overview</CardTitle>
                    <CardDescription>
                      Ownership, client and internal structure
                    </CardDescription>
                  </div>

                  {isDraft && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingOverview((v) => !v)}
                    >
                      <SquarePen className="h-4 w-4 mr-1" />
                      {editingOverview ? "Close" : "Edit"}
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">

                  {/* CLIENT */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Client</p>

                    {editingOverview ? (
                      <select
                        value={clientIdDraft}
                        onChange={(e) => setClientIdDraft(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm"
                      >
                        <option value="">Select client</option>
                        {clients.map((c) => (
                          <option key={c.id} value={`client:${c.id}`}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm">
                        {invoice.client_name_snapshot || "—"}
                      </p>
                    )}
                  </div>

                  {/* COMPANY */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Company</p>

                    {editingOverview ? (
                      <select
                        value={companyIdDraft}
                        onChange={(e) => setCompanyIdDraft(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm"
                      >
                        <option value="">Select</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm">
                        {invoice.company_name_snapshot || "—"}
                      </p>
                    )}
                  </div>

                  {/* PROJECT */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Project</p>

                    {editingOverview ? (
                      <select
                        value={projectIdDraft}
                        onChange={(e) => setProjectIdDraft(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm"
                      >
                        <option value="">None</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm">{project?.name || "—"}</p>
                    )}
                  </div>

                  {/* TASK */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Task</p>

                    {editingOverview ? (
                      <select
                        value={taskIdDraft}
                        onChange={(e) => setTaskIdDraft(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm"
                      >
                        <option value="">None</option>
                        {tasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm">{task?.title || "—"}</p>
                    )}
                  </div>

                </CardContent>
              </Card>

                            {/* FINANCIAL SETTINGS */}
              <Card className="rounded-[30px] border border-white/10 bg-white/[0.045]">
                <CardHeader className="flex flex-row items-center justify-between px-5 py-4">
                  <div>
                    <CardTitle>Financial Settings</CardTitle>
                    <CardDescription>
                      Currency, terms, and banking configuration
                    </CardDescription>
                  </div>

                  {isDraft && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEditingFinancialSettings((v) => !v)
                      }
                    >
                      <SquarePen className="h-4 w-4 mr-1" />
                      {editingFinancialSettings ? "Close" : "Edit"}
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">

                  {/* CURRENCY */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Currency</p>

                    {editingFinancialSettings ? (
                      <select
                        value={currencyIdDraft}
                        onChange={(e) =>
                          setCurrencyIdDraft(e.target.value)
                        }
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm"
                      >
                        <option value="">Select</option>
                        {currencies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.currency_code}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm">{currencyCode}</p>
                    )}
                  </div>

                  {/* PAYMENT TERMS */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Payment Terms</p>

                    {editingFinancialSettings ? (
                      <select
                        value={paymentTermsIdDraft}
                        onChange={(e) =>
                          setPaymentTermsIdDraft(e.target.value)
                        }
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm"
                      >
                        <option value="">Select</option>
                        {paymentTerms.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm">
                        {invoice.payment_terms_snapshot || "—"}
                      </p>
                    )}
                  </div>

                  {/* SHIPPING TERMS */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1">
                      Shipping Terms
                    </p>

                    {editingFinancialSettings ? (
                      <select
                        value={shippingTermIdDraft}
                        onChange={(e) =>
                          setShippingTermIdDraft(e.target.value)
                        }
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm"
                      >
                        <option value="">Select</option>
                        {shippingTerms.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm">
                        {invoice.shipping_terms_snapshot || "—"}
                      </p>
                    )}
                  </div>

                  {/* BANK */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1">
                      Bank Account
                    </p>

                    {editingFinancialSettings ? (
                      <select
                        value={bankAccountIdDraft}
                        onChange={(e) =>
                          setBankAccountIdDraft(e.target.value)
                        }
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm"
                      >
                        <option value="">Select</option>
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm space-y-1">
                        {buildBankDetailsLinesFromSnapshot(
                          invoice.bank_details_snapshot
                        ).map((line, idx) => (
                          <p key={idx}>{line}</p>
                        ))}
                      </div>
                    )}
                  </div>

                </CardContent>
              </Card>

              {/* DOCUMENT DETAILS */}
              <Card className="rounded-[30px] border border-white/10 bg-white/[0.045]">
                <CardHeader className="flex flex-row items-center justify-between px-5 py-4">
                  <div>
                    <CardTitle>Document Details</CardTitle>
                    <CardDescription>
                      Dates, notes, and legal text
                    </CardDescription>
                  </div>

                  {isDraft && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEditingDocumentDetails((v) => !v)
                      }
                    >
                      <SquarePen className="h-4 w-4 mr-1" />
                      {editingDocumentDetails ? "Close" : "Edit"}
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="flex flex-col gap-4 p-5">

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        Issue Date
                      </p>

                      {editingDocumentDetails ? (
                        <input
                          type="date"
                          value={issueDateDraft}
                          onChange={(e) =>
                            setIssueDateDraft(e.target.value)
                          }
                          className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm"
                        />
                      ) : (
                        <p className="text-sm">
                          {formatFinanceDate(invoice.issue_date)}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        Due Date
                      </p>

                      {editingDocumentDetails ? (
                        <input
                          type="date"
                          value={dueDateDraft}
                          onChange={(e) =>
                            setDueDateDraft(e.target.value)
                          }
                          className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm"
                        />
                      ) : (
                        <p className="text-sm">
                          {formatFinanceDate(invoice.due_date)}
                        </p>
                      )}
                    </div>

                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-1">Notes</p>

                    {editingDocumentDetails ? (
                      <textarea
                        value={notesDraft}
                        onChange={(e) =>
                          setNotesDraft(e.target.value)
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm"
                        rows={3}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-line">
                        {invoice.notes || "—"}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-1">
                      Terms & Conditions
                    </p>

                    {editingDocumentDetails ? (
                      <textarea
                        value={termsAndConditionsDraft}
                        onChange={(e) =>
                          setTermsAndConditionsDraft(e.target.value)
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm"
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-line">
                        {invoice.terms_and_conditions_snapshot || "—"}
                      </p>
                    )}
                  </div>

                </CardContent>
              </Card>

              {/* LINE ITEMS */}
              <Card className="rounded-[30px] border border-white/10 bg-white/[0.045]">
                <CardHeader className="flex flex-row items-center justify-between px-5 py-4">
                  <div>
                    <CardTitle>Line Items</CardTitle>
                    <CardDescription>
                      Pricing and revenue structure
                    </CardDescription>
                  </div>

                  {isDraft && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingLines((v) => !v)}
                    >
                      <SquarePen className="h-4 w-4 mr-1" />
                      {editingLines ? "Close" : "Edit"}
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="flex flex-col gap-4 p-5 max-h-[720px] overflow-y-auto pr-1">

                                    {(editingLines ? lineItemsDraft : lineItems).map(
                    (line: any, index: number) => {
                      return (
                        <div
                          key={line.id || index}
                          className="rounded-[24px] border border-white/10 bg-black/20 p-4 space-y-3"
                        >

                          {/* ROW 1 */}
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">

                            {/* ITEM */}
                            <div>
                              <p className="text-xs text-slate-500 mb-1">
                                Item
                              </p>

                              {editingLines ? (
                                <select
                                  value={line.item_id}
                                  onChange={(e) =>
                                    handleLineChange(
                                      line.id,
                                      "item_id",
                                      e.target.value
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-2 text-xs"
                                >
                                  <option value="">Select</option>
                                  {items.map((i) => (
                                    <option key={i.id} value={i.id}>
                                      {i.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <p className="text-sm">
                                  {line.description}
                                </p>
                              )}
                            </div>

                            {/* DESCRIPTION */}
                            <div className="md:col-span-2">
                              <p className="text-xs text-slate-500 mb-1">
                                Description
                              </p>

                              {editingLines ? (
                                <input
                                  value={line.description}
                                  onChange={(e) =>
                                    handleLineChange(
                                      line.id,
                                      "description",
                                      e.target.value
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-xs"
                                />
                              ) : (
                                <p className="text-sm">
                                  {line.description}
                                </p>
                              )}
                            </div>

                            {/* QTY */}
                            <div>
                              <p className="text-xs text-slate-500 mb-1">
                                Qty
                              </p>

                              {editingLines ? (
                                <input
                                  value={line.quantity}
                                  onChange={(e) =>
                                    handleLineChange(
                                      line.id,
                                      "quantity",
                                      e.target.value
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-2 text-xs"
                                />
                              ) : (
                                <p className="text-sm">
                                  {line.quantity}
                                </p>
                              )}
                            </div>

                            {/* PRICE */}
                            <div>
                              <p className="text-xs text-slate-500 mb-1">
                                Unit Price
                              </p>

                              {editingLines ? (
                                <input
                                  value={line.unit_price}
                                  onChange={(e) =>
                                    handleLineChange(
                                      line.id,
                                      "unit_price",
                                      e.target.value
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-2 text-xs"
                                />
                              ) : (
                                <p className="text-sm">
                                  {formatFinanceMoney(
                                    line.unit_price,
                                    currencyCode
                                  )}
                                </p>
                              )}
                            </div>

                          </div>

                          {/* ROW 2 */}
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">

                            {/* DISCOUNT */}
                            <div>
                              <p className="text-xs text-slate-500 mb-1">
                                Discount
                              </p>

                              {editingLines ? (
                                <input
                                  value={line.discount}
                                  onChange={(e) =>
                                    handleLineChange(
                                      line.id,
                                      "discount",
                                      e.target.value
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-2 text-xs"
                                />
                              ) : (
                                <p className="text-sm">
                                  {formatFinanceMoney(
                                    line.discount,
                                    currencyCode
                                  )}
                                </p>
                              )}
                            </div>

                            {/* TAX */}
                            <div>
                              <p className="text-xs text-slate-500 mb-1">
                                Tax
                              </p>

                              {editingLines ? (
                                <select
                                  value={line.tax_code_id}
                                  onChange={(e) =>
                                    handleLineChange(
                                      line.id,
                                      "tax_code_id",
                                      e.target.value
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-2 text-xs"
                                >
                                  <option value="">None</option>
                                  {taxCodes.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <p className="text-sm">
                                  {taxCodes.find(
                                    (t) => t.id === line.tax_code_id
                                  )?.name || "—"}
                                </p>
                              )}
                            </div>

                            {/* UNIT */}
                            <div>
                              <p className="text-xs text-slate-500 mb-1">
                                Unit
                              </p>

                              {editingLines ? (
                                <select
                                  value={line.unit_of_measure_id}
                                  onChange={(e) =>
                                    handleLineChange(
                                      line.id,
                                      "unit_of_measure_id",
                                      e.target.value
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-2 text-xs"
                                >
                                  <option value="">None</option>
                                  {unitsOfMeasure.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <p className="text-sm">
                                  {unitsOfMeasure.find(
                                    (u) =>
                                      u.id === line.unit_of_measure_id
                                  )?.name || "—"}
                                </p>
                              )}
                            </div>

                            {/* CATEGORY */}
                            <div>
                              <p className="text-xs text-slate-500 mb-1">
                                Category
                              </p>

                              {editingLines ? (
                                <select
                                  value={line.revenue_category_id}
                                  onChange={(e) =>
                                    handleLineChange(
                                      line.id,
                                      "revenue_category_id",
                                      e.target.value
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-2 text-xs"
                                >
                                  <option value="">None</option>
                                  {revenueCategories.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <p className="text-sm">
                                  {revenueCategories.find(
                                    (r) =>
                                      r.id ===
                                      line.revenue_category_id
                                  )?.name || "—"}
                                </p>
                              )}
                            </div>

                            {/* TOTAL */}
                            <div>
                              <p className="text-xs text-slate-500 mb-1">
                                Line Total
                              </p>

                              <div className="min-h-[40px] flex items-center px-3 rounded-xl border border-cyan-400/15 bg-cyan-500/10 text-xs font-semibold text-cyan-100">
                                {formatFinanceMoney(
                                  line.line_total,
                                  currencyCode
                                )}
                              </div>
                            </div>

                          </div>

                          {editingLines && (
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveLine(line.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          )}

                        </div>
                      );
                    }
                  )}

                  {editingLines && (
                    <Button
                      onClick={handleAddLine}
                      className="rounded-2xl"
                    >
                      Add Line
                    </Button>
                  )}

                </CardContent>
              </Card>

            </div>

            {/* RIGHT COLUMN */}
            <div className="flex flex-col gap-6">

              {/* FINANCIAL SUMMARY */}
              <Card className="rounded-[30px] border border-white/10 bg-white/[0.045]">
                <CardHeader className="px-5 py-4">
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>

                <CardContent className="p-5 space-y-3 text-sm">

                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>
                      {formatFinanceMoney(
                        financialSummary?.subtotal,
                        currencyCode
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span>
                      {formatFinanceMoney(
                        financialSummary?.discount,
                        currencyCode
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>
                      {formatFinanceMoney(
                        financialSummary?.tax,
                        currencyCode
                      )}
                    </span>
                  </div>

                  <div className="border-t border-white/10 pt-3 flex justify-between font-medium">
                    <span>Total</span>
                    <span>
                      {formatFinanceMoney(
                        financialSummary?.total,
                        currencyCode
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-emerald-300">
                    <span>Paid</span>
                    <span>
                      {formatFinanceMoney(
                        financialSummary?.paid,
                        currencyCode
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-rose-300">
                    <span>Balance</span>
                    <span>
                      {formatFinanceMoney(
                        financialSummary?.balance,
                        currencyCode
                      )}
                    </span>
                  </div>

                </CardContent>
              </Card>

                            {/* LINKED DOCUMENTS */}
              <Card className="rounded-[30px] border border-white/10 bg-white/[0.045]">
                <CardHeader className="px-5 py-4">
                  <CardTitle>Linked Documents</CardTitle>
                  <CardDescription>
                    Payments and related records
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 flex flex-col gap-3">

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Payments Received
                    </p>

                    {payments.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No payments yet
                      </p>
                    ) : (
                      payments.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm flex justify-between items-center"
                        >
                          <div>
                            <p>
                              {formatFinanceMoney(
                                p.converted_amount,
                                currencyCode
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatFinanceDate(p.payment_date)}
                            </p>
                          </div>

                          <Badge className="text-xs">
                            {p.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>

                </CardContent>
              </Card>

              {/* ARCHIVE */}
              <Card className="rounded-[30px] border border-white/10 bg-white/[0.045]">
                <CardHeader className="flex flex-row items-center justify-between px-5 py-4">
                  <div>
                    <CardTitle>Archive</CardTitle>
                    <CardDescription>
                      Archived and deleted invoices
                    </CardDescription>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowArchivePopup(true)}
                  >
                    Open
                  </Button>
                </CardHeader>

                <CardContent className="p-5 text-sm text-slate-400">
                  Manage archived and deleted invoices.
                </CardContent>
              </Card>

            </div>
          </div>

          {/* ARCHIVE MODAL */}
          {showArchivePopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="w-[900px] max-h-[80vh] overflow-hidden rounded-[30px] border border-white/10 bg-[#05070d] flex flex-col">

                {/* HEADER */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <h2 className="text-lg font-medium">
                    Archive
                  </h2>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowArchivePopup(false)}
                  >
                    Close
                  </Button>
                </div>

                {/* TABS */}
                <div className="flex gap-2 p-4 border-b border-white/10">
                  <Button
                    size="sm"
                    variant={archiveTab === "archived" ? "default" : "ghost"}
                    onClick={() => setArchiveTab("archived")}
                  >
                    Archived
                  </Button>

                  <Button
                    size="sm"
                    variant={archiveTab === "deleted" ? "default" : "ghost"}
                    onClick={() => setArchiveTab("deleted")}
                  >
                    Deleted
                  </Button>
                </div>

                {/* TABLE */}
                <div className="overflow-x-auto flex-1">
                  <table className="w-full min-w-[800px] text-sm">
                    <thead className="text-slate-500 border-b border-white/10">
                      <tr>
                        <th className="text-left px-4 py-3">Invoice</th>
                        <th className="text-left px-4 py-3">Client</th>
                        <th className="text-left px-4 py-3">Total</th>
                        <th className="text-left px-4 py-3">Updated</th>
                        <th className="text-right px-4 py-3">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {archiveItems
                        .filter((i) => i.status === archiveTab)
                        .map((i) => (
                          <tr
                            key={i.id}
                            className="border-b border-white/10 hover:bg-white/[0.03]"
                          >
                            <td className="px-4 py-3">
                              {i.invoice_number}
                            </td>
                            <td className="px-4 py-3">
                              {i.client_name_snapshot ||
                                i.counterparty_name_snapshot}
                            </td>
                            <td className="px-4 py-3">
                              {formatFinanceMoney(
                                i.total_amount,
                                currencyCode
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {formatFinanceDate(i.updated_at)}
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">

                              <Button
                                size="sm"
                                onClick={async () => {
                                  await supabase.rpc(
                                    "finance_restore_invoice_issued",
                                    { p_invoice_id: i.id }
                                  );
                                  loadInvoice(true);
                                }}
                              >
                                Restore
                              </Button>

                              {archiveTab === "deleted" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={async () => {
                                    await supabase.rpc(
                                      "finance_hard_delete_invoice_issued",
                                      { p_invoice_id: i.id }
                                    );
                                    loadInvoice(true);
                                  }}
                                >
                                  Delete
                                </Button>
                              )}

                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}

          {/* PRINT ROOT */}
          <div style={{ display: "none" }}>
            <div id="invoice-print-root">
              <InvoicePrintDocument
                invoice={invoice}
                lineItems={lineItems}
                financialSummary={financialSummary}
                currency={currencyCode}
              />
            </div>
          </div>

        </div>
      </div>
    );
}
