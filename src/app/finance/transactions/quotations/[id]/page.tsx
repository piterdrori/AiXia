"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QuotationPrintDocument from "./QuotationPrintDocument";
import {
  Archive,
  ArrowRight,
  CheckCircle,
  FileText,
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

type QuotationStatus =
  | "draft"
  | "issued"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted"
  | "archived"
  | "deleted";

type QuotationRecord = {
  id: string;
  quotation_number: string | null;
  client_id: string | null;
  company_id: string | null;
  issue_date: string;
  valid_until: string | null;
  status: QuotationStatus;
  approval_status?: string | null;
  subtotal: number | string | null;
  tax_amount: number | string | null;
  discount_amount: number | string | null;
  total_amount: number | string | null;
  currency_id: string | null;
  currency_code: string | null;
  exchange_rate?: number | string | null;
  payment_terms_id?: string | null;
  shipping_term_id?: string | null;
  bank_account_id?: string | null;
  project_id: string | null;
  task_id: string | null;
  reference_number?: string | null;
  posted_to_ledger?: boolean;
  notes: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  document_version?: number;

  company_name_snapshot: string | null;
  company_legal_name_snapshot?: string | null;
  company_contact_person_snapshot?: string | null;
  company_email_snapshot?: string | null;
  company_phone_snapshot?: string | null;
  company_address_snapshot?: string | null;

  client_name_snapshot: string | null;
  client_legal_name_snapshot?: string | null;
  client_contact_person_snapshot?: string | null;
  billing_address_snapshot?: string | null;
  shipping_address_snapshot?: string | null;
  client_email_snapshot?: string | null;
  client_phone_snapshot?: string | null;

  payment_terms_snapshot?: string | null;
  payment_terms_document_text?: string | null;
  shipping_terms_snapshot?: string | null;
  bank_details_snapshot?: string | null;
  terms_and_conditions_snapshot?: string | null;

  counterparty_type?: string | null;
  counterparty_company_id?: string | null;
  is_intercompany?: boolean;
  counterparty_type_snapshot?: string | null;
  counterparty_name_snapshot?: string | null;
  counterparty_legal_name_snapshot?: string | null;
  counterparty_contact_person_snapshot?: string | null;
  counterparty_email_snapshot?: string | null;
  counterparty_phone_snapshot?: string | null;
};

type QuotationLineItemRow = {
  id: string;
  quotation_id: string;
  item_name?: string | null;
  description?: string | null;
  quantity: number | string | null;
  unit_price: number | string | null;
  discount_rate?: number | string | null;
  tax_rate?: number | string | null;
  line_subtotal?: number | string | null;
  line_discount_amount?: number | string | null;
  line_tax_amount?: number | string | null;
  line_total: number | string | null;
  sort_order: number | null;
};

type ClientPORow = {
  id: string;
  client_po_number: string | null;
  external_po_number: string | null;
  status: string;
  received_at: string | null;
  total_amount: number | string | null;
  created_at: string | null;
};

type ArchiveQuotationRow = {
  id: string;
  quotation_number: string | null;
  status: "archived" | "deleted";
  client_name_snapshot: string | null;
  company_name_snapshot: string | null;
  total_amount: number | string | null;
  updated_at: string | null;
};

type EditableLineItem = {
  id: string;
  item_id: string;
  item_name: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount: string;
  discount_rate: string;
  tax_code_id: string;
  tax_rate: string;
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

type ProjectRow = {
  id: string;
  name: string;
};

type TaskRow = {
  id: string;
  title: string;
  project_id: string | null;
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
  status: string;
  is_default: boolean;
  document_label: string | null;
  document_terms_text: string | null;
};

type ShippingTermOption = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  is_default: boolean;
};

type BankAccountOption = {
  id: string;
  code: string | null;
  name: string;
  account_type: string;
  institution_name: string | null;
  masked_account_number: string | null;
  status: string;
  company_id: string | null;
  beneficiary_name: string | null;
  currency_code: string | null;
  swift_code: string | null;
  iban: string | null;
  bank_address: string | null;
  account_identifier_type: string | null;
  account_identifier_value: string | null;
  bank_name: string | null;
  country: string | null;
  city: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  account_number: string | null;
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
    item_name: "",
    description: "",
    quantity: "1",
    unit_price: "0",
    discount: "0",
    discount_rate: "0",
    tax_code_id: "",
    tax_rate: "0",
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

function joinAddress(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(", ");
}

function getQuotationStatusBadgeClasses(status: QuotationStatus) {
  switch (status) {
    case "draft":
      return "border-slate-400/20 bg-white/[0.06] text-slate-300";
    case "issued":
    case "sent":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "accepted":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "rejected":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "expired":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "converted":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "archived":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "deleted":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    default:
      return "border-white/10 bg-white/10 text-white/75";
  }
}

function getQuotationStatusLabel(status: QuotationStatus) {
  switch (status) {
    case "draft":
      return "Draft";
    case "issued":
      return "Issued";
    case "sent":
      return "Sent";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "expired":
      return "Expired";
    case "converted":
      return "Converted";
    case "archived":
      return "Archived";
    case "deleted":
      return "Deleted";
    default:
      return status;
  }
}

function getEditableStatusLabel(canEditQuotation: boolean) {
  return canEditQuotation ? "Editable" : "Locked";
}

function getBankDisplayName(bank: BankAccountOption | null) {
  if (!bank) return "—";
  return bank.bank_name || bank.institution_name || bank.name || "—";
}

function getBankAccountLabel(bank: BankAccountOption) {
  const identifier =
    bank.iban ||
    bank.swift_code ||
    bank.account_identifier_value ||
    bank.masked_account_number ||
    bank.account_number ||
    bank.code;

  return [getBankDisplayName(bank), identifier].filter(Boolean).join(" • ");
}

function formatBankDetails(bank: BankAccountOption | null) {
  if (!bank) return "";

  const address =
    bank.bank_address ||
    joinAddress([
      bank.address_line_1,
      bank.address_line_2,
      bank.city,
      bank.postal_code,
      bank.country,
    ]);

  const detailLines = [
    bank.beneficiary_name ? `Beneficiary: ${bank.beneficiary_name}` : null,
    getBankDisplayName(bank) !== "—" ? `Bank: ${getBankDisplayName(bank)}` : null,
    address ? `Address: ${address}` : null,
    bank.account_number ? `Account: ${bank.account_number}` : null,
    bank.iban ? `IBAN: ${bank.iban}` : null,
    bank.swift_code ? `SWIFT: ${bank.swift_code}` : null,
    !bank.iban && !bank.swift_code && bank.account_identifier_value
      ? `Identifier: ${bank.account_identifier_value}`
      : null,
    bank.currency_code ? `Currency: ${bank.currency_code}` : null,
  ].filter(Boolean);

  return detailLines.join("\n");
}

function renderBankDetailLines(
  bank: BankAccountOption | null,
  fallbackSnapshot: string | null | undefined
) {
  if (bank) {
    const address =
      bank.bank_address ||
      joinAddress([
        bank.address_line_1,
        bank.address_line_2,
        bank.city,
        bank.postal_code,
        bank.country,
      ]);

    return [
      bank.beneficiary_name,
      address,
      bank.account_number ? `Account: ${bank.account_number}` : null,
      bank.iban ? `IBAN: ${bank.iban}` : null,
      bank.swift_code ? `SWIFT: ${bank.swift_code}` : null,
      !bank.iban && !bank.swift_code && bank.account_identifier_value
        ? `${bank.account_identifier_type || "Identifier"}: ${
            bank.account_identifier_value
          }`
        : null,
      bank.currency_code ? `Currency: ${bank.currency_code}` : null,
    ].filter(Boolean);
  }

  return fallbackSnapshot
    ? fallbackSnapshot
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
}

function getPaymentTermLabel(term: PaymentTermOption | null) {
  if (!term) return "—";
  return term.document_label || term.name || term.code || "—";
}

function getShippingTermLabel(term: ShippingTermOption | null) {
  if (!term) return "—";
  return term.code || term.name || "—";
}

export default function FinanceQuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingSent, setIsMarkingSent] = useState(false);
  const [isMarkingAccepted, setIsMarkingAccepted] = useState(false);
  const [isMarkingRejected, setIsMarkingRejected] = useState(false);

  const [quotation, setQuotation] = useState<QuotationRecord | null>(null);
  const [lineItems, setLineItems] = useState<QuotationLineItemRow[]>([]);
  const [linkedClientPO, setLinkedClientPO] = useState<ClientPORow | null>(null);
  const [archiveItems, setArchiveItems] = useState<ArchiveQuotationRow[]>([]);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermOption[]>([]);
  const [shippingTerms, setShippingTerms] = useState<ShippingTermOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([]);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasureOption[]>([]);
  const [revenueCategories, setRevenueCategories] = useState<
    RevenueCategoryOption[]
  >([]);

  const [showArchivePopup, setShowArchivePopup] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">(
    "archived"
  );

  const [editingOverview, setEditingOverview] = useState(false);
  const [editingFinancialSettings, setEditingFinancialSettings] = useState(false);
  const [editingDocumentDetails, setEditingDocumentDetails] = useState(false);
  const [editingLines, setEditingLines] = useState(false);

  const [counterpartyTypeDraft, setCounterpartyTypeDraft] = useState("client");
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
  const [notesDraft, setNotesDraft] = useState("");
  const [termsAndConditionsDraft, setTermsAndConditionsDraft] = useState("");

  const [lineItemsDraft, setLineItemsDraft] = useState<EditableLineItem[]>([]);
  const [error, setError] = useState("");

  const handlePrint = useCallback(() => {
    const printContent = document.getElementById("quotation-print-root");
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=900,height=1200");

    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Quotation</title>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  }, []);

  const loadArchiveItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("finance_quotations")
      .select(
        "id, quotation_number, status, client_name_snapshot, company_name_snapshot, total_amount, updated_at"
      )
      .in("status", ["archived", "deleted"])
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to load archived quotations:", error);
      return;
    }

    setArchiveItems((data || []) as ArchiveQuotationRow[]);
  }, []);

  const loadQuotation = useCallback(
    async (refreshOnly = false) => {
      if (!id) return;

      if (!refreshOnly) {
        setIsLoading(true);
      }

      setError("");

      try {
        const [quotationResult, lineItemsResult, poResult] = await Promise.all([
          supabase
            .from("finance_quotations")
            .select(
              [
                "id",
                "quotation_number",
                "client_id",
                "company_id",
                "issue_date",
                "valid_until",
                "status",
                "approval_status",
                "subtotal",
                "tax_amount",
                "discount_amount",
                "total_amount",
                "currency_id",
                "currency_code",
                "exchange_rate",
                "payment_terms_id",
                "shipping_term_id",
                "bank_account_id",
                "project_id",
                "task_id",
                "reference_number",
                "posted_to_ledger",
                "notes",
                "metadata",
                "created_at",
                "updated_at",
                "created_by",
                "updated_by",
                "document_version",
                "client_name_snapshot",
                "client_legal_name_snapshot",
                "client_contact_person_snapshot",
                "billing_address_snapshot",
                "shipping_address_snapshot",
                "client_email_snapshot",
                "client_phone_snapshot",
                "company_name_snapshot",
                "company_legal_name_snapshot",
                "company_contact_person_snapshot",
                "company_address_snapshot",
                "company_email_snapshot",
                "company_phone_snapshot",
                "payment_terms_snapshot",
                "shipping_terms_snapshot",
                "bank_details_snapshot",
                "terms_and_conditions_snapshot",
                "counterparty_type",
                "counterparty_company_id",
                "is_intercompany",
                "counterparty_type_snapshot",
                "counterparty_name_snapshot",
                "counterparty_legal_name_snapshot",
                "counterparty_contact_person_snapshot",
                "counterparty_email_snapshot",
                "counterparty_phone_snapshot",
              ].join(", ")
            )
            .eq("id", id)
            .maybeSingle(),

          supabase
            .from("finance_quotation_line_items")
            .select(
              [
                "id",
                "quotation_id",
                "item_name",
                "description",
                "quantity",
                "unit_price",
                "discount_rate",
                "tax_rate",
                "line_subtotal",
                "line_discount_amount",
                "line_tax_amount",
                "line_total",
                "sort_order",
              ].join(", ")
            )
            .eq("quotation_id", id)
            .order("sort_order", { ascending: true }),

          supabase
            .from("finance_client_purchase_orders")
            .select(
              "id, client_po_number, external_po_number, status, received_at, total_amount, created_at"
            )
            .eq("quotation_id", id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),

          loadArchiveItems(),
        ]);

        if (quotationResult.error) throw quotationResult.error;
        if (lineItemsResult.error) throw lineItemsResult.error;
        if (poResult.error) throw poResult.error;

        let typedQuotation = quotationResult.data as QuotationRecord | null;

        if (typedQuotation?.payment_terms_id) {
          const { data: paymentTermData, error: paymentTermError } = await supabase
            .from("finance_payment_terms")
            .select("name, document_label, document_terms_text")
            .eq("id", typedQuotation.payment_terms_id)
            .maybeSingle();

          if (paymentTermError) {
            console.warn(
              "Failed to load quotation payment term wording:",
              paymentTermError
            );
          }

          if (paymentTermData) {
            typedQuotation = {
              ...typedQuotation,
              payment_terms_snapshot:
                typedQuotation.payment_terms_snapshot ||
                paymentTermData.document_label ||
                paymentTermData.name ||
                null,
              payment_terms_document_text:
                paymentTermData.document_terms_text || null,
            };
          }
        }

        const typedLineItems =
          (lineItemsResult.data || []) as unknown as QuotationLineItemRow[];
        const typedClientPO = (poResult.data || null) as ClientPORow | null;

        setQuotation(typedQuotation);
        setLineItems(typedLineItems);
        setLinkedClientPO(typedClientPO);

        if (typedQuotation) {
          setCounterpartyTypeDraft(typedQuotation.counterparty_type || "client");
          setClientIdDraft(typedQuotation.client_id || "");
          setCompanyIdDraft(typedQuotation.company_id || "");
          setProjectIdDraft(typedQuotation.project_id || "");
          setTaskIdDraft(typedQuotation.task_id || "");
          setIssueDateDraft(typedQuotation.issue_date || "");
          setValidUntilDraft(typedQuotation.valid_until || "");
          setCurrencyIdDraft(typedQuotation.currency_id || "");
          setPaymentTermsIdDraft(typedQuotation.payment_terms_id || "");
          setShippingTermIdDraft(typedQuotation.shipping_term_id || "");
          setBankAccountIdDraft(typedQuotation.bank_account_id || "");
          setNotesDraft(typedQuotation.notes || "");
          setTermsAndConditionsDraft(
            typedQuotation.terms_and_conditions_snapshot || ""
          );

          setLineItemsDraft(
            typedLineItems.map((row) => ({
              id: row.id,
              item_id: "",
              item_name: row.item_name || "",
              description: row.description || row.item_name || "",
              quantity: String(row.quantity ?? 0),
              unit_price: String(row.unit_price ?? 0),
              discount: "0",
              discount_rate: String(row.discount_rate ?? 0),
              tax_code_id: "",
              tax_rate: String(row.tax_rate ?? 0),
              unit_of_measure_id: "",
              revenue_category_id: "",
            }))
          );
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load quotation.");
      } finally {
        setIsLoading(false);
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
        currenciesResult,
        paymentTermsResult,
        shippingTermsResult,
        bankAccountsResult,
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
          .from("finance_currencies")
          .select("id, currency_code, currency_name")
          .eq("status", "active")
          .order("currency_code", { ascending: true }),

        supabase
          .from("finance_payment_terms")
          .select(
            "id, code, name, due_days, status, is_default, document_label, document_terms_text"
          )
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_shipping_terms")
          .select("id, code, name, description, status, is_default")
          .eq("status", "active")
          .order("code", { ascending: true }),

        supabase
          .from("finance_bank_accounts")
          .select(
            "id, code, name, account_type, institution_name, masked_account_number, status, company_id, beneficiary_name, currency_code, swift_code, iban, bank_address, account_identifier_type, account_identifier_value, bank_name, country, city, postal_code, address_line_1, address_line_2, account_number"
          )
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
      setItems((itemsResult.data || []) as ItemOption[]);
      setTaxCodes((taxCodesResult.data || []) as TaxCodeOption[]);
      setUnitsOfMeasure((unitsOfMeasureResult.data || []) as UnitOfMeasureOption[]);
      setRevenueCategories(
        (revenueCategoriesResult.data || []) as RevenueCategoryOption[]
      );
    } catch (err) {
      console.error("Failed to load quotation master data:", err);
    }
  }, []);

  useEffect(() => {
    void loadQuotation();
    void loadMasterData();
  }, [loadMasterData, loadQuotation]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`quotation-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_quotations",
          filter: `id=eq.${id}`,
        },
        () => void loadQuotation(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_quotation_line_items",
          filter: `quotation_id=eq.${id}`,
        },
        () => void loadQuotation(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_client_purchase_orders",
        },
        () => void loadQuotation(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadQuotation]);

  const totals = useMemo(() => {
    if (!quotation) return null;

    return {
      subtotal: toNumber(quotation.subtotal),
      discount: toNumber(quotation.discount_amount),
      tax: toNumber(quotation.tax_amount),
      total: toNumber(quotation.total_amount),
    };
  }, [quotation]);

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
    [shippingTermIdDraft, shippingTerms]
  );

  const filteredBankAccounts = useMemo(() => {
    if (!companyIdDraft) {
      return bankAccounts;
    }

    return bankAccounts.filter(
      (account) => !account.company_id || account.company_id === companyIdDraft
    );
  }, [bankAccounts, companyIdDraft]);

  const selectedDraftBankAccount = useMemo(
    () => bankAccounts.find((entry) => entry.id === bankAccountIdDraft) ?? null,
    [bankAccountIdDraft, bankAccounts]
  );

  const filteredDraftTasks = useMemo(() => {
    if (!projectIdDraft) {
      return tasks;
    }

    return tasks.filter((task) => task.project_id === projectIdDraft);
  }, [projectIdDraft, tasks]);

  const companyAddress =
    joinAddress([
      selectedDraftCompany?.address_line_1,
      selectedDraftCompany?.address_line_2,
      selectedDraftCompany?.city,
      selectedDraftCompany?.state_province,
      selectedDraftCompany?.postal_code,
      selectedDraftCompany?.country,
    ]) ||
    quotation?.company_address_snapshot ||
    "";

  const clientAddress =
    joinAddress([
      selectedDraftClient?.address_line_1,
      selectedDraftClient?.address_line_2,
      selectedDraftClient?.city,
      selectedDraftClient?.state_province,
      selectedDraftClient?.postal_code,
      selectedDraftClient?.country,
    ]) ||
    quotation?.billing_address_snapshot ||
    "";

  const bankDetailsText =
    formatBankDetails(selectedDraftBankAccount) ||
    quotation?.bank_details_snapshot ||
    "";

  const draftTotals = useMemo(() => {
    const subtotal = lineItemsDraft.reduce(
      (sum, row) => sum + toNumber(row.quantity) * toNumber(row.unit_price),
      0
    );

    const discount = lineItemsDraft.reduce((sum, row) => {
      const qty = toNumber(row.quantity);
      const price = toNumber(row.unit_price);
      const base = qty * price;

      if (toNumber(row.discount) > 0) {
        return sum + toNumber(row.discount);
      }

      if (toNumber(row.discount_rate) > 0) {
        return sum + base * (toNumber(row.discount_rate) / 100);
      }

      return sum;
    }, 0);

    const tax = lineItemsDraft.reduce((sum, row) => {
      const qty = toNumber(row.quantity);
      const price = toNumber(row.unit_price);
      const base = qty * price;

      const rowDiscount =
        toNumber(row.discount) > 0
          ? toNumber(row.discount)
          : base * (toNumber(row.discount_rate) / 100);

      const taxableBase = Math.max(base - rowDiscount, 0);

      const taxCode =
        taxCodes.find((t) => t.id === row.tax_code_id)?.rate_percent ??
        toNumber(row.tax_rate);

      return sum + taxableBase * (toNumber(taxCode) / 100);
    }, 0);

    const total = Math.max(subtotal - discount + tax, 0);

    return {
      subtotal,
      discount,
      tax,
      total,
    };
  }, [lineItemsDraft, taxCodes]);

  const canEditQuotation =
    quotation?.status === "draft" ||
    quotation?.status === "issued" ||
    quotation?.status === "sent" ||
    quotation?.status === "accepted";

  const canMarkSent =
    quotation?.status === "draft" || quotation?.status === "issued";

  const canMarkAccepted = quotation?.status === "sent";

  const canMarkRejected =
    quotation?.status === "draft" ||
    quotation?.status === "issued" ||
    quotation?.status === "sent";

  const financialSummary = useMemo(() => {
    if (!quotation || !totals) return null;

    if (canEditQuotation) {
      return {
        subtotal: draftTotals.subtotal,
        discount: draftTotals.discount,
        tax: draftTotals.tax,
        total: draftTotals.total,
      };
    }

    return totals;
  }, [canEditQuotation, draftTotals, quotation, totals]);

  useEffect(() => {
    if (!quotation || !canEditQuotation || !selectedDraftClient) return;

    if (selectedDraftClient.currency_code && !currencyIdDraft) {
      const matchedCurrency = currencies.find(
        (currency) => currency.currency_code === selectedDraftClient.currency_code
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
      const base = new Date(issueDateDraft || new Date().toISOString().slice(0, 10));
      base.setDate(base.getDate() + days);
      setValidUntilDraft(base.toISOString().slice(0, 10));
    }
  }, [
    canEditQuotation,
    currencies,
    currencyIdDraft,
    issueDateDraft,
    paymentTermsIdDraft,
    quotation,
    selectedDraftClient,
    validUntilDraft,
  ]);

  useEffect(() => {
    if (!quotation || !canEditQuotation) return;

    const taskStillValid = filteredDraftTasks.some((task) => task.id === taskIdDraft);

    if (taskIdDraft && !taskStillValid) {
      setTaskIdDraft("");
    }
  }, [canEditQuotation, filteredDraftTasks, quotation, taskIdDraft]);

  useEffect(() => {
    if (
      bankAccountIdDraft &&
      filteredBankAccounts.length > 0 &&
      !filteredBankAccounts.some((account) => account.id === bankAccountIdDraft)
    ) {
      setBankAccountIdDraft("");
    }
  }, [bankAccountIdDraft, filteredBankAccounts]);

  const handleMarkSent = useCallback(async () => {
    if (!quotation || !id) return;

    setIsMarkingSent(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("finance_quotations")
        .update({
          status: "sent",
        })
        .eq("id", id)
        .in("status", ["draft", "issued"]);

      if (updateError) throw updateError;

      await loadQuotation(true);
    } catch (err) {
      console.error(err);
      setError("Failed to mark quotation as sent.");
    } finally {
      setIsMarkingSent(false);
    }
  }, [id, loadQuotation, quotation]);

  const handleMarkAccepted = useCallback(async () => {
    if (!quotation || !id) return;

    setIsMarkingAccepted(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("finance_quotations")
        .update({
          status: "accepted",
        })
        .eq("id", id)
        .eq("status", "sent");

      if (updateError) throw updateError;

      await loadQuotation(true);
    } catch (err) {
      console.error(err);
      setError("Failed to mark quotation as accepted.");
    } finally {
      setIsMarkingAccepted(false);
    }
  }, [id, loadQuotation, quotation]);

  const handleMarkRejected = useCallback(async () => {
    if (!quotation || !id) return;

    setIsMarkingRejected(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("finance_quotations")
        .update({
          status: "rejected",
        })
        .eq("id", id)
        .in("status", ["draft", "issued", "sent"]);

      if (updateError) throw updateError;

      await loadQuotation(true);
    } catch (err) {
      console.error(err);
      setError("Failed to mark quotation as rejected.");
    } finally {
      setIsMarkingRejected(false);
    }
  }, [id, loadQuotation, quotation]);

  const handleArchive = useCallback(async () => {
    if (!quotation || !id) return;

    setIsArchiving(true);
    setError("");

    try {
      const { error } = await supabase
        .from("finance_quotations")
        .update({
          status: "archived",
        })
        .eq("id", id);

      if (error) throw error;

      setEditingOverview(false);
      setEditingFinancialSettings(false);
      setEditingDocumentDetails(false);
      setEditingLines(false);
      await loadQuotation(true);
      await loadArchiveItems();
      setShowArchivePopup(true);
    } catch (err) {
      console.error(err);
      setError("Failed to move quotation to archive.");
    } finally {
      setIsArchiving(false);
    }
  }, [id, loadArchiveItems, loadQuotation, quotation]);

  const handleDelete = useCallback(async () => {
    if (!quotation || !id) return;

    setIsDeleting(true);
    setError("");

    try {
      const { error } = await supabase
        .from("finance_quotations")
        .update({
          status: "deleted",
        })
        .eq("id", id);

      if (error) throw error;

      setEditingOverview(false);
      setEditingFinancialSettings(false);
      setEditingDocumentDetails(false);
      setEditingLines(false);
      await loadQuotation(true);
      await loadArchiveItems();
      setShowArchivePopup(true);
    } catch (err) {
      console.error(err);
      setError("Failed to delete quotation.");
    } finally {
      setIsDeleting(false);
    }
  }, [id, loadArchiveItems, loadQuotation, quotation]);

  const handleRestore = useCallback(
    async (quotationId: string) => {
      setIsSavingDraft(true);
      setError("");

      try {
        const { data: quotationRow, error: fetchError } = await supabase
          .from("finance_quotations")
          .select("metadata")
          .eq("id", quotationId)
          .single();

        if (fetchError) throw fetchError;

        const metadata =
          quotationRow && typeof quotationRow.metadata === "object"
            ? (quotationRow.metadata as Record<string, unknown>)
            : {};

        const previousStatus =
          typeof metadata.previous_status === "string" &&
          metadata.previous_status.trim() !== ""
            ? metadata.previous_status
            : "draft";

        const { error } = await supabase
          .from("finance_quotations")
          .update({
            status: previousStatus,
          })
          .eq("id", quotationId);

        if (error) throw error;

        await Promise.all([loadQuotation(true), loadArchiveItems()]);
      } catch (err) {
        console.error(err);
        setError("Failed to restore quotation.");
      } finally {
        setIsSavingDraft(false);
      }
    },
    [loadArchiveItems, loadQuotation]
  );

  const handleHardDelete = useCallback(
    async (quotationId: string) => {
      setIsDeleting(true);
      setError("");

      try {
        const { error } = await supabase
          .from("finance_quotations")
          .delete()
          .eq("id", quotationId);

        if (error) throw error;

        if (quotationId === id) {
          navigate("/finance/transactions/quotations");
          return;
        }

        await loadArchiveItems();
      } catch (err) {
        console.error(err);
        setError("Failed to permanently delete archived quotation.");
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
              item_name: "",
            };
          }

          const taxCode = taxCodes.find(
            (code) => code.id === selectedItem.tax_code_id
          );

          return {
            ...entry,
            item_id: selectedItem.id,
            item_name: selectedItem.name,
            description: selectedItem.description || selectedItem.name,
            unit_price: String(selectedItem.sales_price ?? 0),
            tax_code_id: selectedItem.tax_code_id || "",
            tax_rate: String(taxCode?.rate_percent ?? 0),
            unit_of_measure_id: selectedItem.unit_of_measure_id || "",
            revenue_category_id: selectedItem.revenue_category_id || "",
          };
        })
      );
    },
    [items, taxCodes]
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
    if (!quotation || !id || !canEditQuotation) return;

    setIsSavingDraft(true);
    setError("");

    const cleanedLineItems = lineItemsDraft.map((row) => ({
      ...row,
      description: row.description.trim(),
      item_name: row.item_name.trim(),
    }));

    const hasAtLeastOneValidLine = cleanedLineItems.some(
      (row) =>
        (row.description || row.item_name) &&
        toNumber(row.quantity) > 0 &&
        toNumber(row.unit_price) >= 0
    );

    if (!hasAtLeastOneValidLine) {
      setError("Quotation must include at least one valid line item.");
      setIsSavingDraft(false);
      return;
    }

    const hasInvalidLine = cleanedLineItems.some(
      (row) =>
        !(row.description || row.item_name) ||
        toNumber(row.quantity) <= 0 ||
        toNumber(row.unit_price) < 0
    );

    if (hasInvalidLine) {
      setError(
        "Every quotation line must have a description or item name, quantity greater than 0, and unit price 0 or higher."
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

      const selectedPaymentTerm =
        paymentTerms.find((term) => term.id === paymentTermsIdDraft) ?? null;
      const selectedShippingTerm =
        shippingTerms.find((term) => term.id === shippingTermIdDraft) ?? null;
      const selectedBankAccount =
        bankAccounts.find((account) => account.id === bankAccountIdDraft) ?? null;

      const nextBankDetailsSnapshot =
        formatBankDetails(selectedBankAccount) ||
        quotation.bank_details_snapshot ||
        null;

      const { error: quotationError } = await supabase
        .from("finance_quotations")
        .update({
          counterparty_type: counterpartyTypeDraft || "client",
          client_id: clientIdDraft || null,
          company_id: companyIdDraft || null,
          issue_date: issueDateDraft,
          valid_until: validUntilDraft || null,
          currency_id: currencyIdDraft || null,
          currency_code:
            selectedDraftCurrency?.currency_code ||
            quotation.currency_code ||
            "USD",
          payment_terms_id: paymentTermsIdDraft || null,
          shipping_term_id: shippingTermIdDraft || null,
          bank_account_id: bankAccountIdDraft || null,
          project_id: projectIdDraft || null,
          task_id: taskIdDraft || null,
          notes: notesDraft || null,
          terms_and_conditions_snapshot: termsAndConditionsDraft || null,
          payment_terms_snapshot:
            selectedPaymentTerm?.document_label ||
            selectedPaymentTerm?.name ||
            quotation.payment_terms_snapshot ||
            null,
          shipping_terms_snapshot:
            selectedShippingTerm?.code ||
            selectedShippingTerm?.name ||
            quotation.shipping_terms_snapshot ||
            null,
          bank_details_snapshot: nextBankDetailsSnapshot,
          client_name_snapshot:
            selectedDraftClient?.legal_name ||
            selectedDraftClient?.name ||
            quotation.client_name_snapshot,
          client_legal_name_snapshot:
            selectedDraftClient?.legal_name ||
            quotation.client_legal_name_snapshot ||
            null,
          client_contact_person_snapshot:
            selectedDraftClient?.contact_person ||
            quotation.client_contact_person_snapshot ||
            null,
          client_email_snapshot:
            selectedDraftClient?.company_email ||
            selectedDraftClient?.personnel_email ||
            quotation.client_email_snapshot ||
            null,
          client_phone_snapshot:
            selectedDraftClient?.company_phone ||
            selectedDraftClient?.personnel_phone ||
            quotation.client_phone_snapshot ||
            null,
          billing_address_snapshot:
            joinAddress([
              selectedDraftClient?.address_line_1,
              selectedDraftClient?.address_line_2,
              selectedDraftClient?.city,
              selectedDraftClient?.state_province,
              selectedDraftClient?.postal_code,
              selectedDraftClient?.country,
            ]) ||
            quotation.billing_address_snapshot ||
            null,
          company_name_snapshot:
            selectedDraftCompany?.legal_name ||
            selectedDraftCompany?.name ||
            quotation.company_name_snapshot,
          company_legal_name_snapshot:
            selectedDraftCompany?.legal_name ||
            quotation.company_legal_name_snapshot ||
            null,
          company_contact_person_snapshot:
            selectedDraftCompany?.contact_person ||
            quotation.company_contact_person_snapshot ||
            null,
          company_email_snapshot:
            selectedDraftCompany?.email ||
            quotation.company_email_snapshot ||
            null,
          company_phone_snapshot:
            selectedDraftCompany?.phone ||
            quotation.company_phone_snapshot ||
            null,
          company_address_snapshot:
            joinAddress([
              selectedDraftCompany?.address_line_1,
              selectedDraftCompany?.address_line_2,
              selectedDraftCompany?.city,
              selectedDraftCompany?.state_province,
              selectedDraftCompany?.postal_code,
              selectedDraftCompany?.country,
            ]) ||
            quotation.company_address_snapshot ||
            null,
          subtotal: draftTotals.subtotal,
          discount_amount: draftTotals.discount,
          tax_amount: draftTotals.tax,
          total_amount: draftTotals.total,
          updated_by: user.id,
        })
        .eq("id", id)
        .in("status", ["draft", "issued", "sent", "accepted"]);

      if (quotationError) throw quotationError;

      const existingIds = lineItems.map((entry) => entry.id);
      const draftIds = cleanedLineItems
        .filter((entry) => !entry.id.startsWith("new_"))
        .map((entry) => entry.id);

      const idsToDelete = existingIds.filter((entryId) => !draftIds.includes(entryId));

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("finance_quotation_line_items")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) throw deleteError;
      }

      for (let index = 0; index < cleanedLineItems.length; index += 1) {
        const row = cleanedLineItems[index];
        const qty = toNumber(row.quantity);
        const unitPrice = toNumber(row.unit_price);
        const base = qty * unitPrice;
        const lineDiscount =
          toNumber(row.discount) > 0
            ? toNumber(row.discount)
            : base * (toNumber(row.discount_rate) / 100);
        const taxableBase = Math.max(base - lineDiscount, 0);

        const ratePercent =
          toNumber(row.tax_rate) ||
          toNumber(
            taxCodes.find((code) => code.id === row.tax_code_id)?.rate_percent
          );

        const lineTax = taxableBase * (ratePercent / 100);
        const lineTotal = taxableBase + lineTax;

        const payload = {
          quotation_id: id,
          item_name: row.item_name || row.description.trim() || null,
          description: row.description.trim() || null,
          quantity: qty,
          unit_price: unitPrice,
          discount_rate: toNumber(row.discount_rate),
          tax_rate: ratePercent,
          line_subtotal: base,
          line_discount_amount: lineDiscount,
          line_tax_amount: lineTax,
          line_total: lineTotal,
          sort_order: index + 1,
        };

        if (row.id.startsWith("new_")) {
          const { error: insertError } = await supabase
            .from("finance_quotation_line_items")
            .insert(payload);

          if (insertError) throw insertError;
        } else {
          const { error: updateError } = await supabase
            .from("finance_quotation_line_items")
            .update(payload)
            .eq("id", row.id)
            .eq("quotation_id", id);

          if (updateError) throw updateError;
        }
      }

      setEditingOverview(false);
      setEditingFinancialSettings(false);
      setEditingDocumentDetails(false);
      setEditingLines(false);
      await loadQuotation(true);
    } catch (err) {
      console.error(err);
      setError("Failed to save quotation changes.");
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    bankAccountIdDraft,
    bankAccounts,
    canEditQuotation,
    clientIdDraft,
    companyIdDraft,
    counterpartyTypeDraft,
    currencyIdDraft,
    draftTotals.discount,
    draftTotals.subtotal,
    draftTotals.tax,
    draftTotals.total,
    id,
    issueDateDraft,
    lineItems,
    lineItemsDraft,
    loadQuotation,
    notesDraft,
    paymentTerms,
    paymentTermsIdDraft,
    projectIdDraft,
    quotation,
    selectedDraftClient,
    selectedDraftCompany,
    selectedDraftCurrency,
    shippingTermIdDraft,
    shippingTerms,
    taskIdDraft,
    taxCodes,
    termsAndConditionsDraft,
    validUntilDraft,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Loading quotation...
          </div>
        </div>
      </div>
    );
  }

  if (!quotation || !totals) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Quotation not found.
          </div>
        </div>
      </div>
    );
  }

  const printableCurrencyCode =
    selectedDraftCurrency?.currency_code || quotation.currency_code || "USD";

  const visibleArchiveItems = archiveItems.filter(
    (item) => item.status === archiveTab
  );

  const activeSectionClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";

  const innerPanelClass =
    "rounded-[24px] border border-white/10 bg-black/20 p-4";

  const fieldShellClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30";

  const readOnlyFieldClass =
    "flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm leading-6 text-white/80";

  const labelClass = "text-sm font-medium text-slate-300";

  return (
    <>
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

            <div className="relative">
              <button
                type="button"
                onClick={() => navigate("/finance/transactions/quotations")}
                className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:bg-white/[0.08]"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Quotations
              </button>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_620px]">
                <div>
                  <Badge className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Quotation Workspace
                  </Badge>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">
                      {quotation.quotation_number || "Quotation"}
                    </h1>

                    <Badge
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-none ${getQuotationStatusBadgeClasses(
                        quotation.status
                      )}`}
                    >
                      {getQuotationStatusLabel(quotation.status)}
                    </Badge>

                    <Badge
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-none ${
                        canEditQuotation
                          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                          : "border-amber-400/20 bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      {getEditableStatusLabel(canEditQuotation)}
                    </Badge>

                    {linkedClientPO ? (
                      <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200 shadow-none">
                        Linked Client PO
                      </Badge>
                    ) : null}
                  </div>

                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                    Commercial quotation before client PO, proforma invoice,
                    invoice, and payment. Quotations stay editable through
                    negotiation, including accepted quotations, until they are
                    rejected, converted, archived, or deleted.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                      Editable negotiation document
                    </span>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                      Draft → Sent → Accepted
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
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Client
                        </div>
                        <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                          {selectedDraftClient?.legal_name ||
                            selectedDraftClient?.name ||
                            quotation.client_legal_name_snapshot ||
                            quotation.client_name_snapshot ||
                            quotation.counterparty_name_snapshot ||
                            "—"}
                        </div>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3 text-xs leading-5 text-slate-500">
                      Active commercial counterparty for this quotation.
                    </div>
                  </div>

                  <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Total Value
                        </div>
                        <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                          {formatFinanceMoney(
                            financialSummary?.total,
                            printableCurrencyCode
                          )}
                        </div>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3 text-xs leading-5 text-slate-500">
                      Live value reflects editable quotation lines when open.
                    </div>
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

                {canMarkSent ? (
                  <Button
                    onClick={() => void handleMarkSent()}
                    disabled={isMarkingSent}
                    className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isMarkingSent ? "Updating..." : "Mark as Sent"}
                  </Button>
                ) : null}

                {canMarkAccepted ? (
                  <Button
                    onClick={() => void handleMarkAccepted()}
                    disabled={isMarkingAccepted}
                    className="h-11 rounded-2xl border border-emerald-400/20 bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isMarkingAccepted ? "Updating..." : "Mark as Accepted"}
                  </Button>
                ) : null}

                {canMarkRejected ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleMarkRejected()}
                    disabled={isMarkingRejected}
                    className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isMarkingRejected ? "Updating..." : "Reject"}
                  </Button>
                ) : null}

                {quotation.status !== "archived" &&
                quotation.status !== "deleted" ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleArchive()}
                    disabled={isArchiving}
                    className="h-11 rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    {isArchiving ? "Archiving..." : "Archive"}
                  </Button>
                ) : null}

                {quotation.status !== "deleted" &&
                quotation.status !== "converted" ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleDelete()}
                    disabled={isDeleting}
                    className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                ) : null}
              </div>
            </div>
          </section>

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
                        financialSummary?.subtotal,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
                  </div>
                </div>
                <div className="min-w-0 truncate text-sm leading-6 text-slate-400">
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
                        financialSummary?.discount,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                  </div>
                </div>
                <div className="min-w-0 truncate text-sm leading-6 text-slate-400">
                  Commercial adjustment.
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
                        financialSummary?.tax,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                  </div>
                </div>
                <div className="min-w-0 truncate text-sm leading-6 text-slate-400">
                  Calculated from line items.
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
                        financialSummary?.total,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                  </div>
                </div>
                <div className="min-w-0 truncate text-sm leading-6 text-slate-400">
                  Current quotation value.
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
            <div className="space-y-6">
              <Card className={activeSectionClass}>
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
                        Document identity, counterparty, dates, status, currency, and project context.
                      </CardDescription>
                    </div>
                  </div>

                  {canEditQuotation ? (
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
                            onClick={() => setEditingOverview(false)}
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
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Counterparty Type
                    </div>
                    {editingOverview ? (
                      <select
                        value={counterpartyTypeDraft}
                        onChange={(event) =>
                          setCounterpartyTypeDraft(event.target.value)
                        }
                        className="mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                      >
                        <option value="client">Client</option>
                        <option value="company">Intercompany</option>
                      </select>
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {quotation.counterparty_type_snapshot ||
                          quotation.counterparty_type ||
                          "Client"}
                      </div>
                    )}
                  </div>

                  <div className={innerPanelClass}>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Client
                    </div>
                    {editingOverview ? (
                      <select
                        value={clientIdDraft}
                        onChange={(event) => setClientIdDraft(event.target.value)}
                        className="mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
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
                          quotation.client_legal_name_snapshot ||
                          quotation.client_name_snapshot ||
                          "—"}
                      </div>
                    )}
                  </div>

                  <div className={innerPanelClass}>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Issuing Company
                    </div>
                    {editingOverview ? (
                      <select
                        value={companyIdDraft}
                        onChange={(event) => setCompanyIdDraft(event.target.value)}
                        className="mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
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
                          quotation.company_legal_name_snapshot ||
                          quotation.company_name_snapshot ||
                          "—"}
                      </div>
                    )}
                  </div>

                  <div className={innerPanelClass}>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Project
                    </div>
                    {editingOverview ? (
                      <select
                        value={projectIdDraft}
                        onChange={(event) => setProjectIdDraft(event.target.value)}
                        className="mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
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
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Task
                    </div>
                    {editingOverview ? (
                      <select
                        value={taskIdDraft}
                        onChange={(event) => setTaskIdDraft(event.target.value)}
                        className="mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
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

                  <div className={innerPanelClass}>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Currency
                    </div>
                    {editingOverview ? (
                      <select
                        value={currencyIdDraft}
                        onChange={(event) => setCurrencyIdDraft(event.target.value)}
                        className="mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
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
                        {selectedDraftCurrency
                          ? `${selectedDraftCurrency.currency_code} — ${selectedDraftCurrency.currency_name}`
                          : quotation.currency_code || "USD"}
                      </div>
                    )}
                  </div>

                  <div className={innerPanelClass}>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Issue Date
                    </div>
                    {editingOverview ? (
                      <input
                        type="date"
                        value={issueDateDraft}
                        onChange={(event) => setIssueDateDraft(event.target.value)}
                        className="mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                      />
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {formatFinanceDate(quotation.issue_date)}
                      </div>
                    )}
                  </div>

                  <div className={innerPanelClass}>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Valid Until
                    </div>
                    {editingOverview ? (
                      <input
                        type="date"
                        value={validUntilDraft}
                        onChange={(event) => setValidUntilDraft(event.target.value)}
                        className="mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                      />
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {formatFinanceDate(quotation.valid_until)}
                      </div>
                    )}
                  </div>

                  <div className={innerPanelClass}>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Status
                    </div>
                    <div className="mt-2">
                      <Badge
                        className={`rounded-full border px-3 py-1 text-xs shadow-none ${getQuotationStatusBadgeClasses(
                          quotation.status
                        )}`}
                      >
                        {getQuotationStatusLabel(quotation.status)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={activeSectionClass}>
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
                        Payment terms, shipping terms, and issuing bank account from finance master data.
                      </CardDescription>
                    </div>
                  </div>

                  {canEditQuotation ? (
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
                            onClick={() => setEditingFinancialSettings(false)}
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
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Payment Terms
                    </div>
                    {editingFinancialSettings ? (
                      <select
                        value={paymentTermsIdDraft}
                        onChange={(event) =>
                          setPaymentTermsIdDraft(event.target.value)
                        }
                        className="mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                      >
                        <option value="">Select payment terms</option>
                        {paymentTerms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {term.document_label || term.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {getPaymentTermLabel(selectedDraftPaymentTerm) !== "—"
                          ? getPaymentTermLabel(selectedDraftPaymentTerm)
                          : quotation.payment_terms_snapshot || "—"}
                      </div>
                    )}
                  </div>

                  <div className={innerPanelClass}>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Shipping Terms
                    </div>
                    {editingFinancialSettings ? (
                      <select
                        value={shippingTermIdDraft}
                        onChange={(event) =>
                          setShippingTermIdDraft(event.target.value)
                        }
                        className="mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                      >
                        <option value="">Select shipping terms</option>
                        {shippingTerms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {term.code} — {term.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {getShippingTermLabel(selectedDraftShippingTerm) !== "—"
                          ? getShippingTermLabel(selectedDraftShippingTerm)
                          : quotation.shipping_terms_snapshot || "—"}
                      </div>
                    )}
                  </div>

                  <div className={innerPanelClass}>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Bank Account
                    </div>
                    {editingFinancialSettings ? (
                      <select
                        value={bankAccountIdDraft}
                        onChange={(event) =>
                          setBankAccountIdDraft(event.target.value)
                        }
                        className="mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                      >
                        <option value="">Select bank account</option>
                        {filteredBankAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {getBankAccountLabel(account)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {getBankDisplayName(selectedDraftBankAccount)}
                      </div>
                    )}
                  </div>

                  <div className={innerPanelClass}>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Bank Details
                    </div>
                    <div className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
                      {bankDetailsText || "—"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={activeSectionClass}>
                <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Document Details
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Document-level company, client, bank, financial, and terms snapshots.
                      </CardDescription>
                    </div>
                  </div>

                  {canEditQuotation ? (
                    <div className="flex items-center gap-2">
                      {editingDocumentDetails ? (
                        <>
                          <Button
                            onClick={() => void handleSaveDraftChanges()}
                            disabled={isSavingDraft}
                            className="h-9 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {isSavingDraft ? "Saving..." : "Save"}
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => setEditingDocumentDetails(false)}
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
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Issuing Company
                    </div>
                    <div className="mt-3 text-xl font-semibold leading-tight text-white">
                      {selectedDraftCompany?.legal_name ||
                        selectedDraftCompany?.name ||
                        quotation.company_legal_name_snapshot ||
                        quotation.company_name_snapshot ||
                        "—"}
                    </div>
                    <div className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                      <div>
                        {selectedDraftCompany?.contact_person ||
                          quotation.company_contact_person_snapshot ||
                          "—"}
                      </div>
                      <div>
                        {selectedDraftCompany?.email ||
                          quotation.company_email_snapshot ||
                          "—"}
                      </div>
                      <div>
                        {selectedDraftCompany?.phone ||
                          quotation.company_phone_snapshot ||
                          "—"}
                      </div>
                      <div>{companyAddress || "—"}</div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Recipient
                    </div>
                    <div className="mt-3 text-xl font-semibold leading-tight text-white">
                      {selectedDraftClient?.legal_name ||
                        selectedDraftClient?.name ||
                        quotation.client_legal_name_snapshot ||
                        quotation.client_name_snapshot ||
                        quotation.counterparty_name_snapshot ||
                        "—"}
                    </div>
                    <div className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                      <div>
                        {selectedDraftClient?.contact_person ||
                          quotation.client_contact_person_snapshot ||
                          quotation.counterparty_contact_person_snapshot ||
                          "—"}
                      </div>
                      <div>
                        {selectedDraftClient?.company_email ||
                          selectedDraftClient?.personnel_email ||
                          quotation.client_email_snapshot ||
                          quotation.counterparty_email_snapshot ||
                          "—"}
                      </div>
                      <div>
                        {selectedDraftClient?.company_phone ||
                          selectedDraftClient?.personnel_phone ||
                          quotation.client_phone_snapshot ||
                          quotation.counterparty_phone_snapshot ||
                          "—"}
                      </div>
                      <div>{clientAddress || "—"}</div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-2">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Payment Terms
                        </div>
                        <div className="mt-2 text-sm font-semibold text-white">
                          {getPaymentTermLabel(selectedDraftPaymentTerm) !== "—"
                            ? getPaymentTermLabel(selectedDraftPaymentTerm)
                            : quotation.payment_terms_snapshot || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Shipping Terms
                        </div>
                        <div className="mt-2 text-sm font-semibold text-white">
                          {getShippingTermLabel(selectedDraftShippingTerm) !== "—"
                            ? getShippingTermLabel(selectedDraftShippingTerm)
                            : quotation.shipping_terms_snapshot || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Currency
                        </div>
                        <div className="mt-2 text-sm font-semibold text-white">
                          {printableCurrencyCode}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Project / Task
                        </div>
                        <div className="mt-2 text-sm font-semibold text-white">
                          {[selectedDraftProject?.name, selectedDraftTask?.title]
                            .filter(Boolean)
                            .join(" / ") || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-2">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Notes
                    </div>
                    <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">
                      {quotation.notes || "—"}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-2">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Terms &amp; Conditions
                    </div>

                    {editingDocumentDetails ? (
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
                        {quotation.terms_and_conditions_snapshot || "—"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={activeSectionClass}>
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
                        Quotation lines stay editable through negotiation, including accepted quotations.
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

                    {editingLines && canEditQuotation ? (
                      <Button
                        variant="outline"
                        onClick={addDraftLineItem}
                        className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                      >
                        Add Row
                      </Button>
                    ) : null}

                    {canEditQuotation ? (
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

                    const editableBase = Math.max(
                      toNumber((row as EditableLineItem).quantity) *
                        toNumber((row as EditableLineItem).unit_price) -
                        (toNumber((row as EditableLineItem).discount) > 0
                          ? toNumber((row as EditableLineItem).discount)
                          : toNumber((row as EditableLineItem).quantity) *
                              toNumber((row as EditableLineItem).unit_price) *
                              (toNumber((row as EditableLineItem).discount_rate) /
                                100)),
                      0
                    );

                    const editableTaxRate =
                      taxCodes.find(
                        (entry) =>
                          entry.id === (row as EditableLineItem).tax_code_id
                      )?.rate_percent ??
                      toNumber((row as EditableLineItem).tax_rate);

                    const rowTotal = editable
                      ? editableBase +
                        editableBase * (toNumber(String(editableTaxRate)) / 100)
                      : toNumber((row as QuotationLineItemRow).line_total);

                    return (
                      <div
                        key={(row as EditableLineItem | QuotationLineItemRow).id}
                        className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                      >
                        <div className="mb-4 flex items-center justify-between gap-4">
                          <div className="text-sm font-semibold text-white">
                            Line {index + 1}
                          </div>

                          {editable && canEditQuotation ? (
                            <Button
                              variant="outline"
                              onClick={() =>
                                removeDraftLineItem((row as EditableLineItem).id)
                              }
                              disabled={lineItemsDraft.length === 1}
                              className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
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
                                value={(row as EditableLineItem).item_id}
                                onChange={(event) =>
                                  applyDraftItemSelection(
                                    (row as EditableLineItem).id,
                                    event.target.value
                                  )
                                }
                                className={fieldShellClass}
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
                                {(row as QuotationLineItemRow).item_name || "—"}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-4">
                            <div className={labelClass}>Description</div>
                            {editable ? (
                              <input
                                value={(row as EditableLineItem).description}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === (row as EditableLineItem).id
                                        ? {
                                            ...entry,
                                            description: event.target.value,
                                          }
                                        : entry
                                    )
                                  )
                                }
                                className={fieldShellClass}
                              />
                            ) : (
                              <div className={readOnlyFieldClass}>
                                {(row as QuotationLineItemRow).description || "—"}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-1">
                            <div className={labelClass}>Qty</div>
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
                                className={fieldShellClass}
                              />
                            ) : (
                              <div className={readOnlyFieldClass}>
                                {toNumber((row as QuotationLineItemRow).quantity)}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <div className={labelClass}>Unit</div>
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
                                className={fieldShellClass}
                              >
                                <option value="">Select unit</option>
                                {unitsOfMeasure.map((unit) => (
                                  <option key={unit.id} value={unit.id}>
                                    {unit.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className={readOnlyFieldClass}>—</div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <div className={labelClass}>Unit Price</div>
                            {editable ? (
                              <input
                                value={(row as EditableLineItem).unit_price}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === (row as EditableLineItem).id
                                        ? {
                                            ...entry,
                                            unit_price: event.target.value,
                                          }
                                        : entry
                                    )
                                  )
                                }
                                className={fieldShellClass}
                              />
                            ) : (
                              <div className={readOnlyFieldClass}>
                                {formatFinanceMoney(
                                  toNumber((row as QuotationLineItemRow).unit_price),
                                  printableCurrencyCode
                                )}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-1">
                            <div className={labelClass}>Discount</div>
                            {editable ? (
                              <input
                                value={(row as EditableLineItem).discount_rate}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === (row as EditableLineItem).id
                                        ? {
                                            ...entry,
                                            discount_rate: event.target.value,
                                            discount: "0",
                                          }
                                        : entry
                                    )
                                  )
                                }
                                className={fieldShellClass}
                              />
                            ) : (
                              <div className={readOnlyFieldClass}>
                                {toNumber(
                                  (row as QuotationLineItemRow).discount_rate
                                ).toFixed(2)}
                                %
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <div className={labelClass}>Tax Code</div>
                            {editable ? (
                              <select
                                value={(row as EditableLineItem).tax_code_id}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === (row as EditableLineItem).id
                                        ? {
                                            ...entry,
                                            tax_code_id: event.target.value,
                                            tax_rate: String(
                                              taxCodes.find(
                                                (code) =>
                                                  code.id === event.target.value
                                              )?.rate_percent ?? 0
                                            ),
                                          }
                                        : entry
                                    )
                                  )
                                }
                                className={fieldShellClass}
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
                                {toNumber(
                                  (row as QuotationLineItemRow).tax_rate
                                ).toFixed(2)}
                                %
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <div className={labelClass}>Revenue Category</div>
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
                                className={fieldShellClass}
                              >
                                <option value="">Select category</option>
                                {revenueCategories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className={readOnlyFieldClass}>—</div>
                            )}
                          </label>

                          <div className="space-y-2 md:col-span-2">
                            <div className={labelClass}>Line Total</div>
                            <div className="flex min-h-[44px] items-center rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100">
                              {formatFinanceMoney(rowTotal, printableCurrencyCode)}
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
              <Card className={activeSectionClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Financial Summary
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-slate-500">
                    Live quotation totals and document currency view.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  <div className={innerPanelClass}>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Subtotal
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.subtotal,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className={innerPanelClass}>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Discount
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.discount,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className={innerPanelClass}>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Tax
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.tax,
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
                        financialSummary?.total,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={activeSectionClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Linked Client PO
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-slate-500">
                    Downstream client purchase order created from this quotation.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  {!linkedClientPO ? (
                    <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-500">
                      No linked client PO yet.
                    </div>
                  ) : (
                    <>
                      <div className={innerPanelClass}>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Client PO Number
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {linkedClientPO.client_po_number || "—"}
                        </div>
                      </div>

                      <div className={innerPanelClass}>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          External PO Number
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {linkedClientPO.external_po_number || "—"}
                        </div>
                      </div>

                      <div className={innerPanelClass}>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Status
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {linkedClientPO.status || "—"}
                        </div>
                      </div>

                      <div className={innerPanelClass}>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Received At
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {formatFinanceDate(linkedClientPO.received_at)}
                        </div>
                      </div>

                      <div className={innerPanelClass}>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Amount
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {formatFinanceMoney(
                            linkedClientPO.total_amount,
                            printableCurrencyCode
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {error ? (
                <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {showArchivePopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0f1a]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <div className="text-lg font-semibold text-white">
                  Quotation Archive
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Archived records can be restored. Deleted records can be
                  restored or permanently deleted.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowArchivePopup(false)}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.08]"
              >
                Close
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={() => setArchiveTab("archived")}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  archiveTab === "archived"
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white/80"
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
                    : "text-white/55 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                Deleted
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {visibleArchiveItems.length === 0 ? (
                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-8 text-sm text-slate-500">
                  No {archiveTab} quotations found.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[24px] border border-white/10">
                  <div className="max-h-[720px] overflow-y-auto">
                    <table className="w-full min-w-[1020px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-black/20 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                            Quotation No.
                          </th>
                          <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                            Client
                          </th>
                          <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                            Company
                          </th>
                          <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                            Total
                          </th>
                          <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                            Status
                          </th>
                          <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                            Updated
                          </th>
                          <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-white/5">
                        {visibleArchiveItems.map((item) => (
                          <tr
                            key={item.id}
                            className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                          >
                            <td className="px-5 py-4 font-semibold text-white">
                              {item.quotation_number || "Quotation"}
                            </td>

                            <td className="px-5 py-4">
                              {item.client_name_snapshot || "—"}
                            </td>

                            <td className="px-5 py-4">
                              {item.company_name_snapshot || "—"}
                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-white">
                              {formatFinanceMoney(
                                item.total_amount,
                                printableCurrencyCode
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <Badge
                                className={`rounded-full border px-3 py-1 text-xs shadow-none ${getQuotationStatusBadgeClasses(
                                  item.status
                                )}`}
                              >
                                {getQuotationStatusLabel(item.status)}
                              </Badge>
                            </td>

                            <td className="px-5 py-4">
                              {formatFinanceDate(item.updated_at)}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    navigate(
                                      `/finance/transactions/quotations/${item.id}`
                                    )
                                  }
                                  className="h-9 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-3 text-cyan-200 hover:bg-cyan-500/20"
                                >
                                  Open
                                </Button>

                                <Button
                                  variant="outline"
                                  onClick={() => void handleRestore(item.id)}
                                  className="h-9 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-3 text-emerald-200 hover:bg-emerald-500/20"
                                >
                                  Restore
                                </Button>

                                {archiveTab === "deleted" ? (
                                  <Button
                                    variant="outline"
                                    onClick={() => void handleHardDelete(item.id)}
                                    className="h-9 rounded-2xl border-rose-500/30 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20"
                                  >
                                    Hard Delete
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ display: "none" }}>
        <div id="quotation-print-root">
          <QuotationPrintDocument
            quotation={quotation}
            lineItems={lineItems}
            financialSummary={financialSummary}
            company={selectedDraftCompany}
            client={selectedDraftClient}
          />
        </div>
      </div>
    </>
  );
}
