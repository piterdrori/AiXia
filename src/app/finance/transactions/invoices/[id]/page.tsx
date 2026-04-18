import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  Printer,
  RefreshCw,
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
  status: "draft" | "issued" | "void" | "archived";
  payment_status: "unpaid" | "partial" | "paid";
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
  status: string;
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
  beneficiary_name: string | null;
  iban: string | null;
  swift_code: string | null;
  bank_address: string | null;
  account_number: string | null;
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
  code: string;
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

function buildBankDetailsLinesFromAccount(account: BankAccountOption | null) {
  if (!account) return [];

  const resolvedBankAddress =
    account.bank_address ||
    [
      account.address_line_1,
      account.address_line_2,
      account.city,
      account.postal_code,
      account.country,
    ]
      .filter(Boolean)
      .join(", ");

  const resolvedSwiftCode =
    account.swift_code ||
    (account.account_identifier_type === "swift"
      ? account.account_identifier_value
      : "") ||
    "";

  return [
    account.beneficiary_name || "",
    account.bank_name || "",
    resolvedBankAddress || "",
    `Account: ${account.account_number || "—"}`,
    `IBAN: ${account.iban || "—"}`,
    `SWIFT: ${resolvedSwiftCode || "—"}`,
    `Currency: ${account.currency_code || "—"}`,
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
    .filter(Boolean);
}

function getDocumentStatusBadgeClasses(status: InvoiceRecord["status"]) {
  if (status === "issued") {
    return "border-sky-400/20 bg-sky-500/10 text-sky-200";
  }

  if (status === "draft") {
    return "border-white/10 bg-white/10 text-white/75";
  }

  if (status === "void") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-200";
  }

    if (status === "archived") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-200";
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
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([]);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasureOption[]>([]);
  const [revenueCategories, setRevenueCategories] = useState<RevenueCategoryOption[]>([]);
   const [showArchivePopup, setShowArchivePopup] = useState(false);

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
        "id, invoice_number, status, client_name_snapshot, total_amount, updated_at"
      )
      .eq("status", "archived")
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
              .select("id, amount, payment_date, status, reference_number")
              .eq("invoice_id", id)
              .eq("status", "confirmed")
              .order("payment_date", { ascending: true }),
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

        setClientIdDraft(typedInvoice.client_id || "");
        setCompanyIdDraft(typedInvoice.company_id || "");
        setProjectIdDraft(typedInvoice.project_id || "");
        setTaskIdDraft(typedInvoice.task_id || "");
        setPaymentTermsIdDraft((typedInvoice as any).payment_terms_id || "");
        setShippingTermIdDraft((typedInvoice as any).shipping_term_id || "");
        setBankAccountIdDraft((typedInvoice as any).bank_account_id || "");
        setCurrencyIdDraft((typedInvoice as any).currency_id || "");
        setPaymentMethodIdDraft(
          ((typedInvoice as any).metadata?.preferred_payment_method_id as string) || ""
        );

        setLineItemsDraft(
          typedLineItems.map((row: any) => ({
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
        supabase.from("projects").select("id, name").order("name", { ascending: true }),
        supabase
          .from("tasks")
          .select("id, title, project_id")
          .order("created_at", { ascending: false }),
        supabase
          .from("finance_payment_terms")
          .select("id, code, name, due_days, is_default")
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
            "id, name, bank_name, beneficiary_name, iban, swift_code, bank_address, account_number, account_identifier_type, account_identifier_value, country, city, postal_code, address_line_1, address_line_2, currency_code, is_default, company_id"
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
    () => paymentMethods.find((entry) => entry.id === paymentMethodIdDraft) ?? null,
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
      filteredDraftBankAccounts.find((account) => account.id === bankAccountIdDraft) ??
      null,
    [bankAccountIdDraft, filteredDraftBankAccounts]
  );

  const resolvedBankDetailsLines = useMemo(() => {
    if (!invoice) return [];

    if (invoice.status === "draft") {
      return buildBankDetailsLinesFromAccount(selectedDraftBankAccount);
    }

    const snapshotLines = buildBankDetailsLinesFromSnapshot(
      invoice.bank_details_snapshot
    );

    if (snapshotLines.length > 0) {
      return snapshotLines;
    }

    const issuedBankAccount =
      bankAccounts.find((account) => account.id === invoice.bank_account_id) ?? null;

    return buildBankDetailsLinesFromAccount(issuedBankAccount);
  }, [bankAccounts, invoice, selectedDraftBankAccount]);

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
        (t) => t.id === row.tax_code_id
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
      if (trimmed) return current;

      return "Payment is due according to the agreed payment terms stated on this invoice. Goods remain subject to the agreed shipping terms. Any bank charges are the responsibility of the payer unless otherwise agreed in writing. Please reference the invoice number with your payment. Late payments may result in delays, additional charges, or suspension of further deliveries or services.";
    });
  }, [invoice, selectedDraftPaymentTerm, selectedDraftShippingTermsLabel]);

  useEffect(() => {
    if (!invoice || invoice.status !== "draft" || !companyIdDraft) return;

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

    const taskStillValid = filteredDraftTasks.some((task) => task.id === taskIdDraft);

    if (taskIdDraft && !taskStillValid) {
      setTaskIdDraft("");
    }
  }, [filteredDraftTasks, invoice, projectIdDraft, taskIdDraft]);
  
  const canEditDraft = invoice?.status === "draft";
  const canArchive = !!invoice && invoice.status !== "archived";
  const canHardDelete = !!invoice && invoice.status === "archived";

  const handleIssue = useCallback(async () => {
    if (!invoice || !id) return;

    setIsIssuing(true);
    setError("");

    try {
      const { error } = await supabase.rpc("finance_issue_invoice_issued", {
        target_invoice_id: id,
      });

      if (error) throw error;

      await loadInvoice(true);
    } catch (err) {
      console.error(err);
      setError("Failed to issue invoice.");
    } finally {
      setIsIssuing(false);
    }
  }, [id, invoice, loadInvoice]);

  const handleArchive = useCallback(async () => {
    if (!invoice || !id) return;

    setIsArchiving(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("finance_invoices_issued")
        .update({
          status: "archived",
          updated_by: user.id,
        })
        .eq("id", id)
        .neq("status", "archived");

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

  const handleHardDelete = useCallback(
    async (invoiceId: string) => {
      setIsDeleting(true);
      setError("");

      try {
        const { error: lineError } = await supabase
          .from("finance_invoice_issued_line_items")
          .delete()
          .eq("invoice_id", invoiceId);

        if (lineError) throw lineError;

        const { error: invoiceError } = await supabase
          .from("finance_invoices_issued")
          .delete()
          .eq("id", invoiceId)
          .eq("status", "archived");

        if (invoiceError) throw invoiceError;

        if (invoiceId === id) {
          navigate("/finance/transactions/invoices");
          return;
        }

        await loadArchiveItems();
      } catch (err) {
        console.error(err);
        setError("Failed to permanently delete archived invoice.");
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

      const selectedCompany =
        companies.find((company) => company.id === companyIdDraft) ?? null;
      const selectedClient =
        clients.find((client) => client.id === clientIdDraft) ?? null;
      const selectedPaymentTerm =
        paymentTerms.find((term) => term.id === paymentTermsIdDraft) ?? null;
      const selectedBankAccount =
        filteredDraftBankAccounts.find((account) => account.id === bankAccountIdDraft) ?? null;
      const selectedCurrency =
        currencies.find((currency) => currency.id === currencyIdDraft) ?? null;

      const companyAddressSnapshot = selectedCompany
        ? [
            selectedCompany.address_line_1,
            selectedCompany.address_line_2,
            selectedCompany.city,
            selectedCompany.state_province,
            selectedCompany.postal_code,
            selectedCompany.country,
          ]
            .filter(Boolean)
            .join(", ") || null
        : null;

      const billingAddressSnapshot = selectedClient
        ? [
            selectedClient.address_line_1,
            selectedClient.address_line_2,
            selectedClient.city,
            selectedClient.state_province,
            selectedClient.postal_code,
            selectedClient.country,
          ]
            .filter(Boolean)
            .join(", ") || null
        : null;

      const bankDetailsSnapshot =
        buildBankDetailsSnapshotFromAccount(selectedBankAccount);

      const { error: invoiceError } = await supabase
        .from("finance_invoices_issued")
        .update({
          client_id: clientIdDraft || invoice.client_id,
          company_id: companyIdDraft || null,
          project_id: projectIdDraft || null,
          task_id: taskIdDraft || null,
          payment_terms_id: paymentTermsIdDraft || null,
          shipping_term_id: shippingTermIdDraft || null,
          bank_account_id: bankAccountIdDraft || null,
          currency_id: currencyIdDraft || null,
          currency_code: selectedCurrency?.currency_code || invoice.currency_code || null,
          issue_date: issueDateDraft,
          due_date: dueDateDraft,
          notes: notesDraft || null,
          company_name_snapshot: selectedCompany?.legal_name || selectedCompany?.name || null,
          company_contact_person_snapshot: selectedCompany?.contact_person || null,
          company_address_snapshot: companyAddressSnapshot,
          company_email_snapshot: selectedCompany?.email || null,
          company_phone_snapshot: selectedCompany?.phone || null,
          client_name_snapshot: selectedClient?.legal_name || selectedClient?.name || null,
          client_contact_person_snapshot: selectedClient?.contact_person || null,
          billing_address_snapshot: billingAddressSnapshot,
          client_email_snapshot:
            selectedClient?.company_email || selectedClient?.personnel_email || null,
          client_phone_snapshot:
            selectedClient?.company_phone || selectedClient?.personnel_phone || null,
          payment_terms_snapshot: selectedPaymentTerm?.name || null,
          shipping_terms_snapshot: selectedDraftShippingTermsLabel || null,
          bank_details_snapshot: bankDetailsSnapshot,
          updated_by: user.id,
          metadata: {
            ...(invoice.metadata || {}),
            preferred_payment_method_id: paymentMethodIdDraft || null,
          },
        })
        .eq("id", id)
        .eq("status", "issued");

      if (invoiceError) throw invoiceError;

      setEditingOverview(false);
      await loadInvoice(true);
    } catch (err) {
      console.error(err);
      setError("Failed to save issued invoice overview changes.");
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    id,
    invoice,
    companyIdDraft,
    clientIdDraft,
    projectIdDraft,
    taskIdDraft,
    paymentTermsIdDraft,
    shippingTermIdDraft,
    bankAccountIdDraft,
    currencyIdDraft,
    paymentMethodIdDraft,
    issueDateDraft,
    dueDateDraft,
    notesDraft,
    companies,
    clients,
    paymentTerms,
    filteredDraftBankAccounts,
    currencies,
    selectedDraftShippingTermsLabel,
    loadInvoice,
  ]);

  
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
}, [
    id,
    invoice,
    termsAndConditionsDraft,
    loadInvoice,
  ]);

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
  }, [id, invoice, lineItemsDraft, loadInvoice]);
  
  
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

      const { error: invoiceError } = await supabase
        .from("finance_invoices_issued")
        .update({
          client_id: clientIdDraft || invoice.client_id,
          company_id: companyIdDraft || null,
          project_id: projectIdDraft || null,
          task_id: taskIdDraft || null,
          payment_terms_id: paymentTermsIdDraft || null,
          shipping_term_id: shippingTermIdDraft || null,
          bank_account_id: bankAccountIdDraft || null,
          currency_id: currencyIdDraft || null,
          issue_date: issueDateDraft,
          due_date: dueDateDraft,
          notes: notesDraft || null,
          terms_and_conditions_snapshot: termsAndConditionsDraft || null,
          updated_by: user.id,
          metadata: {
            ...(invoice as any).metadata,
            preferred_payment_method_id: paymentMethodIdDraft || null,
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
    paymentTermsIdDraft,
    projectIdDraft,
    selectedDraftShippingTermsLabel,
    shippingTermIdDraft,
    taskIdDraft,
    termsAndConditionsDraft,
  ]);
    const printableInvoice = useMemo(() => {
    if (!invoice) return invoice;

    if (invoice.status !== "draft") {
      return invoice;
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
      company_email_snapshot:
        selectedDraftCompany?.email || invoice.company_email_snapshot,
      company_phone_snapshot:
        selectedDraftCompany?.phone || invoice.company_phone_snapshot,
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
  invoice.billing_address_snapshot,
payment_terms_snapshot:
  selectedDraftPaymentTerm?.name ||
  invoice.payment_terms_snapshot,
shipping_terms_snapshot:
  selectedDraftShippingTermsLabel ||
  invoice.shipping_terms_snapshot,
      terms_and_conditions_snapshot:
  invoice.status === "draft"
    ? termsAndConditionsDraft || invoice.terms_and_conditions_snapshot
    : invoice.terms_and_conditions_snapshot,
      bank_details_snapshot: draftBankDetails,
      currency_code:
        selectedDraftCurrency?.currency_code || invoice.currency_code || "USD",
    };
}, [
  invoice,
  selectedDraftBankAccount,
  selectedDraftClient,
  selectedDraftCompany,
  selectedDraftCurrency,
  selectedDraftPaymentTerm,
  selectedDraftShippingTermsLabel,
  termsAndConditionsDraft,
]);

  if (isLoading) {
    return <div className="p-6 text-white/50">Loading invoice...</div>;
  }

   if (!invoice || !totals) {
    return <div className="p-6 text-white/50">Invoice not found.</div>;
  }

  const displayState = getInvoiceDisplayState(invoice as any);

    const printableLineItems = lineItems.map((row) => ({
    id: row.id,
    description: row.description || "—",
    quantity: toNumber(row.quantity),
    unitPrice: toNumber(row.unit_price),
    discount: toNumber(row.discount),
    lineTotal: toNumber(row.line_total),
  }));

  return (
    <>
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-8 pt-2 sm:px-6 xl:px-8">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6 xl:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_24%)]" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-4xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/70 shadow-none">
                    Receivables
                  </Badge>
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Invoice workspace
                  </Badge>
                </div>

                <div className="space-y-3">
                 <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                      {invoice.invoice_number}
                    </h1>

                    <Badge
                      className={`rounded-full border px-3 py-1 text-xs shadow-none ${getDocumentStatusBadgeClasses(
                        invoice.status
                      )}`}
                    >
                      {getIssuedInvoiceStatusLabel(invoice.status)}
                    </Badge>

                    <Badge
                      className={`rounded-full border px-3 py-1 text-xs shadow-none ${getPaymentStatusBadgeClasses(
                        invoice.payment_status
                      )}`}
                    >
                      {getIssuedInvoicePaymentStatusLabel(invoice.payment_status)}
                    </Badge>

                    <Badge
                      className={`rounded-full border px-3 py-1 text-xs shadow-none ${getPostingStatusBadgeClasses(
                        displayState.postingStatus
                      )}`}
                    >
                      {getPostingStatusLabel(displayState.postingStatus)}
                    </Badge>

                    {displayState.isOverdue ? (
                      <Badge
                        className={`rounded-full border px-3 py-1 text-xs shadow-none ${getOverdueBadgeClasses()}`}
                      >
                        Overdue
                      </Badge>
                    ) : null}
                  </div>

                  <div className="text-sm text-white/50">
                    Final outbound receivable document issued by your company to the
                    client. Drafts are editable. Issued records are mostly locked.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 xl:justify-end">
                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/transactions/invoices")}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                
                                 {invoice.status === "draft" ? (
                  <Button
                    onClick={() => void handleIssue()}
                    disabled={isIssuing}
                    className="h-11 rounded-2xl px-4"
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
                    className="h-11 rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isArchiving ? "Archiving..." : "Archive"}
                  </Button>
                ) : null}

                <Button
                  variant="outline"
                  onClick={() => void loadInvoice(true)}
                  disabled={isRefreshing}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <div className="space-y-6">
              <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-white">Document Overview</CardTitle>
                    <CardDescription className="text-white/45">
                      Commercial header, operational references, and lifecycle state.
                    </CardDescription>
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

                    <Button
                      variant="outline"
                      onClick={() => setEditingOverview((current) => !current)}
                      className="h-9 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
                    >
                      <SquarePen className="mr-2 h-4 w-4" />
                      {editingOverview ? "Close" : "Edit"}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                              {editingOverview ? (
                  <>
                    <label className="space-y-2">
                      <div className="text-sm text-white/70">Issuing Company</div>
                      <select
                        value={companyIdDraft}
                        onChange={(event) => setCompanyIdDraft(event.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
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
                      <div className="text-sm text-white/70">Client</div>
                      <select
                        value={clientIdDraft}
                        onChange={(event) => setClientIdDraft(event.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                      >
                        <option value="">Select client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.legal_name || client.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm text-white/70">Payment Terms</div>
                      <select
                        value={paymentTermsIdDraft}
                        onChange={(event) => setPaymentTermsIdDraft(event.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                      >
                        <option value="">Select payment terms</option>
                        {paymentTerms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {term.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm text-white/70">Shipping Terms</div>
                      <select
                        value={shippingTermIdDraft}
                        onChange={(event) => setShippingTermIdDraft(event.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                      >
                        <option value="">Select shipping terms</option>
                        {shippingTerms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {term.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm text-white/70">Bank Account</div>
                      <select
                        value={bankAccountIdDraft}
                        onChange={(event) => setBankAccountIdDraft(event.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
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
                      <div className="text-sm text-white/70">Preferred Payment Method</div>
                      <select
                        value={paymentMethodIdDraft}
                        onChange={(event) => setPaymentMethodIdDraft(event.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
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
                      <div className="text-sm text-white/70">Issue Date</div>
                      <input
                        type="date"
                        value={issueDateDraft}
                        onChange={(e) => setIssueDateDraft(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                      />
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm text-white/70">Due Date</div>
                      <input
                        type="date"
                        value={dueDateDraft}
                        onChange={(e) => setDueDateDraft(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                      />
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm text-white/70">Currency</div>
                      <select
                        value={currencyIdDraft}
                        onChange={(event) => setCurrencyIdDraft(event.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
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
                      <div className="text-sm text-white/70">Project</div>
                      <select
                        value={projectIdDraft}
                        onChange={(event) => setProjectIdDraft(event.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                      >
                        <option value="">No project</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm text-white/70">Task</div>
                      <select
                        value={taskIdDraft}
                        onChange={(event) => setTaskIdDraft(event.target.value)}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                      >
                        <option value="">No task</option>
                        {filteredDraftTasks.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.title}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="space-y-2">
                      <div className="text-sm text-white/70">Posted To Ledger</div>
                      <div className="flex h-11 w-full items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                        {invoice.posted_to_ledger ? "Posted" : "Not Posted"}
                      </div>
                    </div>

                    <div className="md:col-span-3">
                      <div className="text-sm text-white/70">Notes</div>
                      <textarea
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        rows={4}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Issuing Company
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">
                        {invoice.status === "draft"
                          ? selectedDraftCompany?.legal_name || selectedDraftCompany?.name || "—"
                          : invoice.company_name_snapshot || "—"}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Client
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">
                        {invoice.status === "draft"
                          ? selectedDraftClient?.legal_name || selectedDraftClient?.name || "—"
                          : invoice.client_name_snapshot || "—"}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Payment Terms
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">
                        {invoice.status === "draft"
                          ? selectedDraftPaymentTerm?.name || "—"
                          : invoice.payment_terms_snapshot || "—"}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Shipping Terms
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">
                        {invoice.status === "draft"
                          ? selectedDraftShippingTermsLabel || "—"
                          : invoice.shipping_terms_snapshot || "—"}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Bank Account
                      </div>
                      <div className="mt-2 space-y-1 text-base font-semibold text-white">
                        {resolvedBankDetailsLines.length > 0 ? (
                          resolvedBankDetailsLines.map((line, index) => (
                            <div key={`${line}-${index}`}>{line}</div>
                          ))
                        ) : (
                          <div>—</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Preferred Payment Method
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">
                        {invoice.status === "draft"
                          ? selectedDraftPaymentMethod?.name || "—"
                          : ((invoice.metadata?.preferred_payment_method_id as string | undefined) &&
                              paymentMethods.find(
                                (method) =>
                                  method.id ===
                                  (invoice.metadata?.preferred_payment_method_id as string)
                              )?.name) ||
                            "—"}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Issue Date
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">
                        {invoice.status === "draft"
                          ? formatFinanceDate(issueDateDraft)
                          : formatFinanceDate(invoice.issue_date)}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Due Date
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">
                        {invoice.status === "draft"
                          ? formatFinanceDate(dueDateDraft)
                          : formatFinanceDate(invoice.due_date)}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Currency
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">
                        {invoice.status === "draft"
                          ? selectedDraftCurrency
                            ? `${selectedDraftCurrency.currency_code} — ${selectedDraftCurrency.currency_name}`
                            : invoice.currency_code || "USD"
                          : invoice.currency_code || "USD"}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Project
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">
                        {invoice.status === "draft"
                          ? selectedDraftProject?.name || "—"
                          : project?.name || "—"}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Task
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">
                        {invoice.status === "draft"
                          ? selectedDraftTask?.title || "—"
                          : task?.title || "—"}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Posted To Ledger
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">
                        {invoice.posted_to_ledger ? "Posted" : "Not Posted"}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3 md:col-span-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Notes
                      </div>
                      <div className="mt-2 text-sm leading-6 text-white/70">
                        {invoice.notes || "—"}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

                      <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-white">Document Parties</CardTitle>
                    <CardDescription className="text-white/45">
                      {invoice.status === "draft"
                        ? "Auto-filled from the selected company, client, payment terms, and bank account."
                        : "Snapshot values frozen at issuance time."}
                    </CardDescription>
                  </div>
                  <div />
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                              {invoice.status === "draft" ? (
  <>
    <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
        Issuing Company
      </div>
      <div className="mt-3 text-sm text-white/75">
        {selectedDraftCompany?.legal_name || selectedDraftCompany?.name || "—"}
      </div>
    </div>

    <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
        Client
      </div>
      <div className="mt-3 text-sm text-white/75">
        {selectedDraftClient?.legal_name || selectedDraftClient?.name || "—"}
      </div>
    </div>

    <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
        Terms & Conditions
      </div>
      <textarea
        value={termsAndConditionsDraft}
        onChange={(e) => setTermsAndConditionsDraft(e.target.value)}
        rows={6}
        className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
      />
    </div>

    <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
        Bank Details
      </div>
      <div className="mt-3 text-sm text-white/75">
        {resolvedBankDetailsLines.length > 0
          ? resolvedBankDetailsLines.map((line, i) => <div key={i}>{line}</div>)
          : "—"}
      </div>
    </div>
  </>
) : (
                  <>
                    <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Issuing Company
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-white/75">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                            Legal Name
                          </div>
                          <div className="mt-1 font-semibold text-white">
                            {invoice.company_name_snapshot || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                            Contact Person
                          </div>
                          <div className="mt-1">
                            {invoice.company_contact_person_snapshot ||
                              companies.find((company) => company.id === invoice.company_id)
                                ?.contact_person ||
                              "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                            Email
                          </div>
                          <div className="mt-1">{invoice.company_email_snapshot || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                            Phone
                          </div>
                          <div className="mt-1">{invoice.company_phone_snapshot || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                            Primary Address
                          </div>
                          <div className="mt-1 leading-6">
                            {invoice.company_address_snapshot || "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Client
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-white/75">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                            Legal Name
                          </div>
                          <div className="mt-1 font-semibold text-white">
                            {invoice.client_name_snapshot || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                            Contact Person
                          </div>
                          <div className="mt-1">
                            {invoice.client_contact_person_snapshot ||
                              clients.find((client) => client.id === invoice.client_id)
                                ?.contact_person ||
                              "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                            Email
                          </div>
                          <div className="mt-1">{invoice.client_email_snapshot || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                            Phone
                          </div>
                          <div className="mt-1">{invoice.client_phone_snapshot || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                            Primary Address
                          </div>
                          <div className="mt-1 leading-6">
                            {invoice.billing_address_snapshot || "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Terms &amp; Conditions
                        </div>

                        <div className="flex items-center gap-2">
                          {editingParties ? (
                            <Button
                              onClick={() => void handleSaveIssuedPartiesChanges()}
                              disabled={isSavingDraft}
                              className="h-9 rounded-2xl px-3"
                            >
                              <Save className="mr-2 h-4 w-4" />
                              {isSavingDraft ? "Saving..." : "Save"}
                            </Button>
                          ) : null}

                          <Button
                            variant="outline"
                            onClick={() => setEditingParties((current) => !current)}
                            className="h-9 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
                          >
                            <SquarePen className="mr-2 h-4 w-4" />
                            {editingParties ? "Close" : "Edit"}
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-4 text-sm text-white/75">

  <div>
    <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
      Payment Terms
    </div>
    <div className="mt-1">
      {invoice.payment_terms_snapshot || "—"}
    </div>
  </div>

  <div>
    <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
      Shipping Terms
    </div>
    <div className="mt-1">
      {invoice.shipping_terms_snapshot || "—"}
    </div>
  </div>

  <div>
    <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
      Terms and Conditions
    </div>

    {editingParties ? (
      <textarea
        value={termsAndConditionsDraft}
        onChange={(event) => setTermsAndConditionsDraft(event.target.value)}
        rows={7}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
      />
    ) : (
      <div className="mt-1 whitespace-pre-line leading-6">
      {(invoice as any).terms_and_conditions_snapshot ||
        "Payment is due according to agreed terms."}
      </div>
    )}
  </div>

</div>

                
                    </div>

                    <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Bank Details
                      </div>
                      <div className="mt-3 text-sm text-white/75">
                        {resolvedBankDetailsLines.length > 0 ? (
                          resolvedBankDetailsLines.map((line, index) => (
                            <div key={`${line}-${index}`}>{line}</div>
                          ))
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-white">Line Items</CardTitle>
                    <CardDescription className="text-white/45">
                      Draft invoices can be edited here. Issued invoices are read-only unless corrected manually.
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
                        className="h-9 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
                      >
                        Add Row
                      </Button>
                    ) : null}

                    <Button
                      variant="outline"
                      onClick={() => setEditingLines((current) => !current)}
                      className="h-9 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
                    >
                      <SquarePen className="mr-2 h-4 w-4" />
                      {editingLines ? "Close" : "Edit"}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
               {(editingLines ? lineItemsDraft : lineItems).map((row, index) => {
                  const editable = editingLines;

                  const editableBase = Math.max(
                    toNumber((row as EditableLineItem).quantity) *
                      toNumber((row as EditableLineItem).unit_price) -
                      toNumber((row as EditableLineItem).discount),
                    0
                  );

                  const editableTaxRate =
                    taxCodes.find(
                      (entry) =>
                        entry.id === (row as EditableLineItem).tax_code_id
                    )?.rate_percent ?? 0;

                  const rowTotal = editable
                    ? editableBase +
                      editableBase *
                        (toNumber(String(editableTaxRate)) / 100)
                    : toNumber((row as LineItemRow).line_total);

                  return (
                    <div
                      key={(row as EditableLineItem | LineItemRow).id}
                      className="rounded-[22px] border border-white/8 bg-black/15 p-4"
                    >
                                            <div className="mb-4 flex items-center justify-between gap-4">
                        <div className="text-sm font-medium text-white">
                          Line {index + 1}
                        </div>

                        {editable && canEditDraft ? (
                          <Button
                            variant="outline"
                            onClick={() =>
                              removeDraftLineItem(
                                (row as EditableLineItem).id
                              )
                            }
                            disabled={lineItemsDraft.length === 1}
                            className="h-9 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <label className="space-y-2 md:col-span-3">
                          <div className="text-sm text-white/70">Item</div>
                          {editable ? (
                            <select
                              value={(row as EditableLineItem).item_id}
                               onChange={(event) =>
                                applyDraftItemSelection(
                                  (row as EditableLineItem).id,
                                  event.target.value
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                            >
                              <option value="">Select item</option>
                              {items.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                              {items.find(
                                (item) =>
                                  item.id ===
                                  ((row as EditableLineItem).item_id || (row as any).item_id)
                              )?.name || "—"}
                            </div>
                          )}
                        </label>

                        <label className="space-y-2 md:col-span-4">
                          <div className="text-sm text-white/70">Description</div>
                          {editable ? (
                            <input
                              value={(row as EditableLineItem).description}
                              onChange={(event) =>
                                setLineItemsDraft((current) =>
                                  current.map((entry) =>
                                    entry.id === (row as EditableLineItem).id
                                      ? { ...entry, description: event.target.value }
                                      : entry
                                  )
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                            />
                          ) : (
                            <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                              {(row as any).description || "—"}
                            </div>
                          )}
                        </label>

                        <label className="space-y-2 md:col-span-1">
                          <div className="text-sm text-white/70">Qty</div>
                          {editable ? (
                            <input
                              value={(row as EditableLineItem).quantity}
                              onChange={(event) =>
                                setLineItemsDraft((current) =>
                                  current.map((entry) =>
                                    entry.id === (row as EditableLineItem).id
                                      ? { ...entry, quantity: event.target.value }
                                      : entry
                                  )
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                            />
                          ) : (
                            <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                              {toNumber((row as any).quantity)}
                            </div>
                          )}
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className="text-sm text-white/70">Unit</div>
                          {editable ? (
                            <select
                              value={(row as EditableLineItem).unit_of_measure_id}
                              onChange={(event) =>
                                setLineItemsDraft((current) =>
                                  current.map((entry) =>
                                    entry.id === (row as EditableLineItem).id
                                      ? {
                                          ...entry,
                                          unit_of_measure_id: event.target.value,
                                        }
                                      : entry
                                  )
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                            >
                              <option value="">Select unit</option>
                              {unitsOfMeasure.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                  {unit.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                              {unitsOfMeasure.find(
                                (unit) =>
                                  unit.id ===
                                  ((row as EditableLineItem).unit_of_measure_id ||
                                    (row as any).unit_of_measure_id)
                              )?.name || "—"}
                            </div>
                          )}
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className="text-sm text-white/70">Unit Price</div>
                          {editable ? (
                            <input
                              value={(row as EditableLineItem).unit_price}
                              onChange={(event) =>
                                setLineItemsDraft((current) =>
                                  current.map((entry) =>
                                    entry.id === (row as EditableLineItem).id
                                      ? { ...entry, unit_price: event.target.value }
                                      : entry
                                  )
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                            />
                          ) : (
                            <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                              {formatFinanceMoney(
                                toNumber((row as any).unit_price),
                                invoice.currency_code || "USD"
                              )}
                            </div>
                          )}
                        </label>

                        <label className="space-y-2 md:col-span-1">
                          <div className="text-sm text-white/70">Discount</div>
                          {editable ? (
                            <input
                              value={(row as EditableLineItem).discount}
                              onChange={(event) =>
                                setLineItemsDraft((current) =>
                                  current.map((entry) =>
                                    entry.id === (row as EditableLineItem).id
                                      ? { ...entry, discount: event.target.value }
                                      : entry
                                  )
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                            />
                          ) : (
                            <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                              {formatFinanceMoney(
                                toNumber((row as any).discount),
                                invoice.currency_code || "USD"
                              )}
                            </div>
                          )}
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className="text-sm text-white/70">Tax Code</div>
                          {editable ? (
                            <select
                              value={(row as EditableLineItem).tax_code_id}
                              onChange={(event) =>
                                setLineItemsDraft((current) =>
                                  current.map((entry) =>
                                    entry.id === (row as EditableLineItem).id
                                      ? { ...entry, tax_code_id: event.target.value }
                                      : entry
                                  )
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                            >
                              <option value="">Select tax</option>
                              {taxCodes.map((taxCode) => (
                                <option key={taxCode.id} value={taxCode.id}>
                                  {taxCode.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                              {taxCodes.find(
                                (taxCode) =>
                                  taxCode.id ===
                                  ((row as EditableLineItem).tax_code_id ||
                                    (row as any).tax_code_id)
                              )?.name || "—"}
                            </div>
                          )}
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className="text-sm text-white/70">Revenue Category</div>
                          {editable ? (
                            <select
                              value={(row as EditableLineItem).revenue_category_id}
                              onChange={(event) =>
                                setLineItemsDraft((current) =>
                                  current.map((entry) =>
                                    entry.id === (row as EditableLineItem).id
                                      ? {
                                          ...entry,
                                          revenue_category_id: event.target.value,
                                        }
                                      : entry
                                  )
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                            >
                              <option value="">Select category</option>
                              {revenueCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                              {revenueCategories.find(
                                (category) =>
                                  category.id ===
                                  ((row as EditableLineItem).revenue_category_id ||
                                    (row as any).revenue_category_id)
                              )?.name || "—"}
                            </div>
                          )}
                        </label>

                        <div className="space-y-2 md:col-span-2">
                          <div className="text-sm text-white/70">Line Total</div>
                          <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                            {formatFinanceMoney(rowTotal, invoice.currency_code || "USD")}
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
            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="text-white">Financial Summary</CardTitle>
                <CardDescription className="text-white/45">
                  Live totals, collection state, and remaining balance.
                </CardDescription>
              </CardHeader>

                            <CardContent className="space-y-3 p-5">
                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Subtotal
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatFinanceMoney(
                      financialSummary?.subtotal ?? 0,
                      selectedDraftCurrency?.currency_code ||
                        invoice.currency_code ||
                        "USD"
                    )}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Discount
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatFinanceMoney(
                      financialSummary?.discount ?? 0,
                      selectedDraftCurrency?.currency_code ||
                        invoice.currency_code ||
                        "USD"
                    )}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Tax
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatFinanceMoney(
                      financialSummary?.tax ?? 0,
                      selectedDraftCurrency?.currency_code ||
                        invoice.currency_code ||
                        "USD"
                    )}
                  </div>
                </div>

                <div className="rounded-[20px] border border-cyan-400/15 bg-cyan-500/10 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                    Total
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {formatFinanceMoney(
                      financialSummary?.total ?? 0,
                      selectedDraftCurrency?.currency_code ||
                        invoice.currency_code ||
                        "USD"
                    )}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Paid
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatFinanceMoney(
                      financialSummary?.paid ?? 0,
                      selectedDraftCurrency?.currency_code ||
                        invoice.currency_code ||
                        "USD"
                    )}
                  </div>
                </div>

                <div className="rounded-[20px] border border-amber-400/15 bg-amber-500/10 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-amber-100/70">
                    Balance Due
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {formatFinanceMoney(
                      financialSummary?.balance ?? 0,
                      selectedDraftCurrency?.currency_code ||
                        invoice.currency_code ||
                        "USD"
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="text-white">Payment History</CardTitle>
                <CardDescription className="text-white/45">
                  Confirmed payments linked to this invoice.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                {payments.length === 0 ? (
                  <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-4 text-sm text-white/45">
                    No payments received yet.
                  </div>
                ) : (
                  payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className="text-sm font-medium text-white">
                              {payment.reference_number || "Confirmed payment"}
                            </div>
                          <div className="mt-1 text-xs text-white/45">
                            {formatFinanceDate(payment.payment_date)}
                          </div>
                        </div>

                        <div className="text-sm font-semibold text-white">
                          {formatFinanceMoney(
                            payment.amount,
                            invoice.currency_code || "USD"
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-white">Archive</CardTitle>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowArchivePopup((current) => !current);
                      void loadArchiveItems();
                    }}
                    className="h-9 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
                  >
                    {showArchivePopup ? "Close" : "Open Archive"}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-4 text-sm text-white/55">
                  Delete logic is soft-first. Archive moves the invoice to archived
                   state. Hard delete is only available inside the archive list.
                </div>

                {canHardDelete ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleHardDelete(invoice.id)}
                    disabled={isDeleting}
                    className="h-11 w-full rounded-2xl border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Hard Delete This Invoice"}
                  </Button>
                ) : null}

                {showArchivePopup ? (
                  <div className="space-y-3 rounded-[22px] border border-white/8 bg-black/15 p-4">
                    <div className="text-sm font-medium text-white">
                      Archived Invoices
                    </div>

                    {archiveItems.length === 0 ? (
                      <div className="text-sm text-white/45">
                        No archived invoices.
                      </div>
                    ) : (
                      archiveItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-medium text-white">
                                {item.invoice_number}
                              </div>
                              <div className="mt-1 text-xs text-white/45">
                                {item.client_name_snapshot || "—"} •{" "}
                                {formatFinanceDate(item.updated_at || null)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="text-sm text-white/65">
                                {formatFinanceMoney(
                                  toNumber(item.total_amount),
                                  invoice.currency_code || "USD"
                                )}
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => void handleHardDelete(item.id)}
                                disabled={isDeleting}
                                className="h-9 rounded-2xl border-rose-400/20 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
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
