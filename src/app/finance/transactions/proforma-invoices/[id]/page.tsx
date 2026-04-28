"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Printer,
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

type ProformaRecord = {
  id: string;
  proforma_number: string | null;
  client_id: string | null;
  issue_date: string;
  valid_until: string | null;
  status:
    | "draft"
    | "issued"
    | "confirmed"
    | "converted"
    | "archived"
    | "canceled"
    | "deleted";
  subtotal: number | string | null;
  tax_amount: number | string | null;
  discount_amount: number | string | null;
  total_amount: number | string | null;
  currency_id: string | null;
  exchange_rate: number | string | null;
  project_id: string | null;
  task_id: string | null;
  payment_terms_id?: string | null;
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

function getProformaStatusBadgeClasses(status: ProformaRecord["status"]) {
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

function getProformaStatusLabel(status: ProformaRecord["status"]) {
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
  const [, setProject] = useState<ProjectRow | null>(null);
  const [, setTask] = useState<TaskRow | null>(null);
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
  const [, setUnitsOfMeasure] = useState<UnitOfMeasureOption[]>(
    []
  );
  const [, setRevenueCategories] = useState<
    RevenueCategoryOption[]
  >([]);

  const [showArchivePopup, setShowArchivePopup] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">(
    "archived"
  );

  const [editingOverview, setEditingOverview] = useState(false);
  const [editingTerms, setEditingTerms] = useState(false);
  const [, setEditingParties] = useState(false);
  const [editingLines, setEditingLines] = useState(false);

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

        setProforma(typedProforma);
        setLineItems(typedLineItems);
        setLinkedInvoice(linkedInvoiceRow);

        if (typedProforma.project_id) {
          const { data: projectRows, error: projectError } = await supabase
            .from("projects")
            .select("id, name")
            .eq("id", typedProforma.project_id)
            .limit(1);

          if (projectError) {
            console.warn("Failed to load linked project:", projectError);
            setProject(null);
          } else {
            setProject(
              ((projectRows || [])[0] as ProjectRow | undefined) || null
            );
          }
        } else {
          setProject(null);
        }

        if (typedProforma.task_id) {
          const { data: taskRows, error: taskError } = await supabase
            .from("tasks")
            .select("id, title, project_id")
            .eq("id", typedProforma.task_id)
            .limit(1);

          if (taskError) {
            console.warn("Failed to load linked task:", taskError);
            setTask(null);
          } else {
            setTask(((taskRows || [])[0] as TaskRow | undefined) || null);
          }
        } else {
          setTask(null);
        }

              const metadata = typedProforma.metadata || {};

        setClientIdDraft(typedProforma.client_id || "");
        setCompanyIdDraft((metadata.issuing_company_id as string) || "");
        setProjectIdDraft(typedProforma.project_id || "");
        setTaskIdDraft(typedProforma.task_id || "");
        setIssueDateDraft(typedProforma.issue_date || "");
        setValidUntilDraft(typedProforma.valid_until || "");
        setCurrencyIdDraft(typedProforma.currency_id || "");
        setPaymentTermsIdDraft(typedProforma.payment_terms_id || "");
        setShippingTermIdDraft((metadata.shipping_term_id as string) || "");
        setBankAccountIdDraft((metadata.bank_account_id as string) || "");
        setPaymentMethodIdDraft(
          (metadata.preferred_payment_method_id as string) || ""
        );
        setTermsAndConditionsDraft(
          typedProforma.terms_and_conditions_snapshot ||
            (metadata.terms_and_conditions_snapshot as string) ||
            ""
        );
        setNotesDraft(typedProforma.notes || "");

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadProforma]);

  const totals = useMemo(() => {
    if (!proforma) return null;

    return {
      subtotal: toNumber(proforma.subtotal),
      discount: toNumber(proforma.discount_amount),
      tax: toNumber(proforma.tax_amount),
      total: toNumber(proforma.total_amount),
    };
  }, [proforma]);

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

  const selectedDraftShippingTermsLabel = useMemo(() => {
    if (!selectedDraftShippingTerm) return "";
    if (selectedDraftShippingTerm.description?.trim()) {
      return `${selectedDraftShippingTerm.name} — ${selectedDraftShippingTerm.description.trim()}`;
    }
    return selectedDraftShippingTerm.name || selectedDraftShippingTerm.code || "";
  }, [selectedDraftShippingTerm]);

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

  const resolvedDraftRecipientAddress = useMemo(
    () => buildClientAddress(selectedDraftClient),
    [selectedDraftClient]
  );

  const resolvedBankDetailsLines = useMemo(
    () => buildBankDetailsLinesFromAccount(selectedDraftBankAccount),
    [selectedDraftBankAccount]
  );

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

  const financialSummary = useMemo(() => {
    if (!proforma || !totals) return null;

    if (proforma.status === "draft") {
      return {
        subtotal: draftTotals.subtotal,
        discount: draftTotals.discount,
        tax: draftTotals.tax,
        total: draftTotals.total,
      };
    }

    return totals;
  }, [draftTotals, proforma, totals]);

  const printableCurrencyCode =
    selectedDraftCurrency?.currency_code ||
    (proforma?.metadata?.currency_code as string | undefined) ||
    "USD";

  const printableProforma = useMemo(() => {
    if (!proforma) return proforma;

    const metadata = proforma.metadata || {};

    return {
      ...proforma,
      company_name_snapshot:
        selectedDraftCompany?.legal_name ||
        selectedDraftCompany?.name ||
        (metadata.company_name_snapshot as string | undefined) ||
        null,
      company_contact_person_snapshot:
        selectedDraftCompany?.contact_person ||
        (metadata.company_contact_person_snapshot as string | undefined) ||
        null,
      company_address_snapshot:
        resolvedDraftCompanyAddress ||
        (metadata.company_address_snapshot as string | undefined) ||
        null,
      company_email_snapshot:
        selectedDraftCompany?.email ||
        (metadata.company_email_snapshot as string | undefined) ||
        null,
      company_phone_snapshot:
        selectedDraftCompany?.phone ||
        (metadata.company_phone_snapshot as string | undefined) ||
        null,
      client_name_snapshot:
        selectedDraftClient?.legal_name ||
        selectedDraftClient?.name ||
        (metadata.client_name_snapshot as string | undefined) ||
        null,
      client_contact_person_snapshot:
        selectedDraftClient?.contact_person ||
        (metadata.client_contact_person_snapshot as string | undefined) ||
        null,
      client_email_snapshot:
        selectedDraftClient?.company_email ||
        selectedDraftClient?.personnel_email ||
        (metadata.client_email_snapshot as string | undefined) ||
        null,
      client_phone_snapshot:
        selectedDraftClient?.company_phone ||
        selectedDraftClient?.personnel_phone ||
        (metadata.client_phone_snapshot as string | undefined) ||
        null,
      billing_address_snapshot:
        resolvedDraftRecipientAddress ||
        (metadata.billing_address_snapshot as string | undefined) ||
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
        selectedDraftShippingTermsLabel ||
        proforma.shipping_terms_snapshot ||
        (metadata.shipping_terms_snapshot as string | undefined) ||
        null,
      terms_and_conditions_snapshot:
        termsAndConditionsDraft ||
        proforma.terms_and_conditions_snapshot ||
        (metadata.terms_and_conditions_snapshot as string | undefined) ||
        null,
      bank_details_snapshot:
        buildBankDetailsSnapshotFromAccount(selectedDraftBankAccount) ||
        (metadata.bank_details_snapshot as string | undefined) ||
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

  const canEditDraft = proforma?.status === "draft";
  const canMarkIssued = proforma?.status === "draft";
  const canConfirm = proforma?.status === "issued";
  const canConvert = proforma?.status === "confirmed";
  const canArchive =
    !!proforma &&
    !["archived", "deleted", "converted"].includes(proforma.status);

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
          shipping_terms_snapshot:
            selectedDraftShippingTermsLabel || null,
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
            shipping_terms_snapshot: selectedDraftShippingTermsLabel || null,
            bank_account_id: bankAccountIdDraft || null,
            bank_details_snapshot:
              buildBankDetailsSnapshotFromAccount(selectedDraftBankAccount),
            preferred_payment_method_id: paymentMethodIdDraft || null,
            preferred_payment_method_name:
              selectedDraftPaymentMethod?.name || null,
            preferred_payment_method_code:
              selectedDraftPaymentMethod?.code || null,
            currency_code: printableCurrencyCode,
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
      setEditingTerms(false);
      setEditingParties(false);
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
      setEditingTerms(false);
      setEditingParties(false);
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

      const selectedShippingTermsText = selectedShippingTerm?.description?.trim()
        ? `${selectedShippingTerm.name} — ${selectedShippingTerm.description.trim()}`
        : selectedShippingTerm?.name || selectedShippingTerm?.code || null;

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
          p_metadata: {
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
            payment_terms_id: paymentTermsIdDraft || null,
            payment_terms_snapshot:
              selectedPaymentTerm?.document_label ||
              selectedPaymentTerm?.name ||
              null,
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
              (proforma.metadata?.currency_code as string | undefined) ||
              "USD",
          },
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
          payment_terms_id: paymentTermsIdDraft || null,
          payment_terms_snapshot:
            selectedPaymentTerm?.document_label ||
            selectedPaymentTerm?.name ||
            null,
          shipping_terms_snapshot: selectedShippingTermsText,
          terms_and_conditions_snapshot: termsAndConditionsDraft || null,
        })
        .eq("id", id)
        .eq("status", "draft");

      if (snapshotError) throw snapshotError;

      setEditingOverview(false);
      setEditingTerms(false);
      setEditingParties(false);
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
    id,
    issueDateDraft,
    lineItemsDraft,
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
    taskIdDraft,
    termsAndConditionsDraft,
    validUntilDraft,
  ]);

  const visibleArchiveItems = archiveItems.filter(
    (item) => item.status === archiveTab
  );

  const sectionCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";

  const summaryBlockClass =
    "rounded-[24px] border border-white/10 bg-black/20 p-4";

  const labelClass = "text-[11px] uppercase tracking-[0.2em] text-slate-500";

  const inputLabelClass = "text-sm font-medium text-slate-300";

  const inputFieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";

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

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
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
                </div>

                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Recipient
                        </p>
                        <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                          {selectedDraftClient?.legal_name ||
                            selectedDraftClient?.name ||
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
                    <Trash2 className="mr-2 h-4 w-4" />
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
            <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-transparent opacity-70" />
              <div className="relative">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Subtotal
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-cyan-100">
                  {formatFinanceMoney(
                    financialSummary?.subtotal ?? 0,
                    printableCurrencyCode
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
                    printableCurrencyCode
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
                    printableCurrencyCode
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
                    printableCurrencyCode
                  )}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-400">
                  Proforma value.
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
                          Company, client, terms, bank, dates, currency, and operational references.
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingOverview ? (
                        <Button
                          onClick={() => void handleSaveDraftChanges()}
                          disabled={isSavingDraft}
                          className="h-9 rounded-2xl px-3"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingDraft ? "Saving..." : "Save"}
                        </Button>
                      ) : null}

                      {canEditDraft ? (
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
                  {editingOverview && canEditDraft ? (
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
                        <div className={inputLabelClass}>Client</div>
                        <select
                          value={clientIdDraft}
                          onChange={(event) =>
                            setClientIdDraft(event.target.value)
                          }
                          className={inputFieldClass}
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
                        <div className={inputLabelClass}>Valid Until</div>
                        <input
                          type="date"
                          value={validUntilDraft}
                          onChange={(event) =>
                            setValidUntilDraft(event.target.value)
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
                        <div className={labelClass}>Status</div>
                        <div className="mt-2 text-sm font-semibold text-white">
                          {getProformaStatusLabel(proforma.status)}
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
                  ) : (
                    <>
                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Issuing Company</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {selectedDraftCompany?.legal_name ||
                            selectedDraftCompany?.name ||
                            (proforma.metadata?.company_name_snapshot as
                              | string
                              | undefined) ||
                            "—"}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">
                          {resolvedDraftCompanyAddress ||
                          proforma.metadata?.company_address_snapshot ? (
                            <div>
                              {resolvedDraftCompanyAddress ||
                                (proforma.metadata
                                  ?.company_address_snapshot as string)}
                            </div>
                          ) : null}
                          {selectedDraftCompany?.contact_person ||
                          proforma.metadata?.company_contact_person_snapshot ? (
                            <div>
                              Contact:{" "}
                              {selectedDraftCompany?.contact_person ||
                                (proforma.metadata
                                  ?.company_contact_person_snapshot as string)}
                            </div>
                          ) : null}
                          {selectedDraftCompany?.email ||
                          proforma.metadata?.company_email_snapshot ? (
                            <div>
                              Email:{" "}
                              {selectedDraftCompany?.email ||
                                (proforma.metadata
                                  ?.company_email_snapshot as string)}
                            </div>
                          ) : null}
                          {selectedDraftCompany?.phone ||
                          proforma.metadata?.company_phone_snapshot ? (
                            <div>
                              Phone:{" "}
                              {selectedDraftCompany?.phone ||
                                (proforma.metadata
                                  ?.company_phone_snapshot as string)}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Recipient</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {selectedDraftClient?.legal_name ||
                            selectedDraftClient?.name ||
                            (proforma.metadata?.client_name_snapshot as
                              | string
                              | undefined) ||
                            "—"}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">
                          {resolvedDraftRecipientAddress ||
                          proforma.metadata?.billing_address_snapshot ? (
                            <div>
                              {resolvedDraftRecipientAddress ||
                                (proforma.metadata
                                  ?.billing_address_snapshot as string)}
                            </div>
                          ) : null}
                          {selectedDraftClient?.contact_person ||
                          proforma.metadata?.client_contact_person_snapshot ? (
                            <div>
                              Contact:{" "}
                              {selectedDraftClient?.contact_person ||
                                (proforma.metadata
                                  ?.client_contact_person_snapshot as string)}
                            </div>
                          ) : null}
                          {selectedDraftClient?.company_email ||
                          selectedDraftClient?.personnel_email ||
                          proforma.metadata?.client_email_snapshot ? (
                            <div>
                              Email:{" "}
                              {selectedDraftClient?.company_email ||
                                selectedDraftClient?.personnel_email ||
                                (proforma.metadata
                                  ?.client_email_snapshot as string)}
                            </div>
                          ) : null}
                          {selectedDraftClient?.company_phone ||
                          selectedDraftClient?.personnel_phone ||
                          proforma.metadata?.client_phone_snapshot ? (
                            <div>
                              Phone:{" "}
                              {selectedDraftClient?.company_phone ||
                                selectedDraftClient?.personnel_phone ||
                                (proforma.metadata
                                  ?.client_phone_snapshot as string)}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Bank Details</div>
                        <div className="mt-2 whitespace-pre-line text-sm text-slate-300">
                          {(resolvedBankDetailsLines.length > 0
                            ? resolvedBankDetailsLines
                            : buildBankDetailsLinesFromSnapshot(
                                proforma.bank_details_snapshot ||
                                  (proforma.metadata
                                    ?.bank_details_snapshot as
                                    | string
                                    | undefined)
                              )
                          ).join("\n") || "—"}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Currency</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {printableCurrencyCode}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Project</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {selectedDraftProject?.name || "—"}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Task</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {selectedDraftTask?.title || "—"}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              </Card>

              <Card className={sectionCardClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Terms & Conditions
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Payment terms, shipping terms, and document terms.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingTerms ? (
                        <Button
                          onClick={() => void handleSaveDraftChanges()}
                          disabled={isSavingDraft}
                          className="h-9 rounded-2xl px-3"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingDraft ? "Saving..." : "Save"}
                        </Button>
                      ) : null}

                      {canEditDraft ? (
                        <Button
                          variant="outline"
                          onClick={() =>
                            setEditingTerms((current) => !current)
                          }
                          className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                        >
                          <SquarePen className="mr-2 h-4 w-4" />
                          {editingTerms ? "Close" : "Edit"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-5">
                  {editingTerms && canEditDraft ? (
                    <>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                      </div>

                      <label className="block space-y-2">
                        <div className={inputLabelClass}>
                          Terms and Conditions
                        </div>
                        <textarea
                          value={termsAndConditionsDraft}
                          onChange={(event) =>
                            setTermsAndConditionsDraft(event.target.value)
                          }
                          rows={4}
                          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30"
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className={summaryBlockClass}>
                          <div className={labelClass}>Payment Terms</div>
                          <div className="mt-2 text-lg font-semibold text-white">
                            {selectedDraftPaymentTerm?.document_label ||
                              selectedDraftPaymentTerm?.name ||
                              proforma.payment_terms_snapshot ||
                              "—"}
                          </div>
                        </div>

                        <div className={summaryBlockClass}>
                          <div className={labelClass}>Shipping Terms</div>
                          <div className="mt-2 text-lg font-semibold text-white">
                            {selectedDraftShippingTermsLabel ||
                              proforma.shipping_terms_snapshot ||
                              "—"}
                          </div>
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Terms and Conditions</div>
                        <div className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
                          {termsAndConditionsDraft ||
                            proforma.terms_and_conditions_snapshot ||
                            "—"}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card className={sectionCardClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Line Items
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Products and services included in this proforma invoice.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {canEditDraft ? (
                        <Button
                          onClick={() => setEditingLines((cur) => !cur)}
                          className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                        >
                          <SquarePen className="mr-2 h-4 w-4" />
                          {editingLines ? "Close" : "Edit"}
                        </Button>
                      ) : null}

                      {editingLines ? (
                        <Button
                          variant="outline"
                          onClick={addDraftLineItem}
                          className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                        >
                          Add Row
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
                  {(editingLines ? lineItemsDraft : lineItems).map((row, index) => {
                    const editable = editingLines && canEditDraft;
                    const rowQuantity = toNumber(row.quantity);
                    const rowUnitPrice = toNumber(row.unit_price);
                    const rowDiscount = toNumber(row.discount);
                    const rowTaxCode =
                      taxCodes.find((t) => t.id === row.tax_code_id)?.rate_percent ?? 0;
                    const rowTotal = Math.max(
                      rowQuantity * rowUnitPrice - rowDiscount + (rowQuantity * rowUnitPrice - rowDiscount) * (rowTaxCode / 100),
                      0
                    );

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
                              className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
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
                                value={row.item_id || ""}
                                onChange={(e) =>
                                  applyDraftItemSelection(row.id, e.target.value)
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
                                {items.find((item) => item.id === row.item_id)?.name || "—"}
                              </div>
                            )}
                          </label>

                                                    <label className="space-y-2 md:col-span-5">
                            <div className={inputLabelClass}>Description</div>
                            {editable ? (
                              <input
                                type="text"
                                value={row.description || ""}
                                onChange={(e) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === row.id
                                        ? { ...entry, description: e.target.value }
                                        : entry
                                    )
                                  )
                                }
                                className={inputFieldClass}
                              />
                            ) : (
                              <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-300">
                                {row.description || "—"}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-1">
                            <div className={inputLabelClass}>Qty</div>
                            {editable ? (
                              <input
                                type="number"
                                min={0}
                                value={String(row.quantity ?? "")}
                                onChange={(e) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === row.id
                                        ? { ...entry, quantity: e.target.value }
                                        : entry
                                    )
                                  )
                                }
                                className={inputFieldClass}
                              />
                            ) : (
                              <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-300">
                                {row.quantity}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-1">
                            <div className={inputLabelClass}>Unit Price</div>
                            {editable ? (
                              <input
                                type="number"
                                min={0}
                                value={String(row.unit_price ?? "")}
                                onChange={(e) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === row.id
                                        ? { ...entry, unit_price: e.target.value }
                                        : entry
                                    )
                                  )
                                }
                                className={inputFieldClass}
                              />
                            ) : (
                              <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-300">
                                {formatFinanceMoney(row.unit_price, printableCurrencyCode)}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-1">
                            <div className={inputLabelClass}>Discount</div>
                            {editable ? (
                              <input
                                type="number"
                                min={0}
                                value={String(row.discount ?? "")}
                                onChange={(e) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === row.id
                                        ? { ...entry, discount: e.target.value }
                                        : entry
                                    )
                                  )
                                }
                                className={inputFieldClass}
                              />
                            ) : (
                              <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-300">
                                {formatFinanceMoney(row.discount, printableCurrencyCode)}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-1">
                            <div className={inputLabelClass}>Total</div>
                            <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white font-semibold">
                              {formatFinanceMoney(rowTotal, printableCurrencyCode)}
                            </div>
                          </label>
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
                    Live totals and conversion state.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Subtotal</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.subtotal ?? 0,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Discount</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.discount ?? 0,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Tax</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.tax ?? 0,
                        printableCurrencyCode
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
                        printableCurrencyCode
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={sectionCardClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Linked Invoice
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-slate-500">
                    Invoice created from this proforma after conversion.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  {!linkedInvoice ? (
                    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-slate-500">
                      No linked invoice yet.
                    </div>
                  ) : (
                    <>
                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Invoice</div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {linkedInvoice.invoice_number || "—"}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Status</div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {linkedInvoice.status || "—"}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Payment Status</div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {linkedInvoice.payment_status || "—"}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Total</div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {formatFinanceMoney(
                            linkedInvoice.total_amount,
                            linkedInvoice.currency_code || printableCurrencyCode
                          )}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Paid</div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {formatFinanceMoney(
                            linkedInvoice.paid_amount,
                            linkedInvoice.currency_code || printableCurrencyCode
                          )}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-amber-400/15 bg-amber-500/10 p-4">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-amber-100/70">
                          Balance Due
                        </div>
                        <div className="mt-2 text-xl font-semibold text-white">
                          {formatFinanceMoney(
                            linkedInvoice.balance_due,
                            linkedInvoice.currency_code || printableCurrencyCode
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/finance/transactions/invoices/${linkedInvoice.id}`
                          )
                        }
                        className="h-11 w-full rounded-2xl border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.08]"
                      >
                        Open Linked Invoice
                      </Button>
                    </>
                  )}
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
