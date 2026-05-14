"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QuotationPrintDocument from "./QuotationPrintDocument";
import {
  Archive,
  CheckCircle,
  Eye,
  FileText,
  Link2,
  Printer,
  RotateCcw,
  Save,
  SquarePen,
  Trash2,
  Wallet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  AixiaActionCard,
  AixiaActionStack,
  AixiaAlert,
  AixiaArchiveManagerModal,
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
  AixiaReviewBlock,
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
} from "@/components/aixia";

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
  currencyCode = "USD",
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
    getBankDisplayName(bank) !== "—"
      ? `Bank: ${getBankDisplayName(bank)}`
      : null,
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
  const [linkedClientPO, setLinkedClientPO] = useState<ClientPORow | null>(
    null,
  );
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
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasureOption[]>(
    [],
  );
  const [revenueCategories, setRevenueCategories] = useState<
    RevenueCategoryOption[]
  >([]);

  const [showArchivePopup, setShowArchivePopup] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">(
    "archived",
  );

  const [editingOverview, setEditingOverview] = useState(false);
  const [editingFinancialSettings, setEditingFinancialSettings] =
    useState(false);
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
        "id, quotation_number, status, client_name_snapshot, company_name_snapshot, total_amount, updated_at",
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
              ].join(", "),
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
              ].join(", "),
            )
            .eq("quotation_id", id)
            .order("sort_order", { ascending: true }),

          supabase
            .from("finance_client_purchase_orders")
            .select(
              "id, client_po_number, external_po_number, status, received_at, total_amount, created_at",
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
          const { data: paymentTermData, error: paymentTermError } =
            await supabase
              .from("finance_payment_terms")
              .select("name, document_label, document_terms_text")
              .eq("id", typedQuotation.payment_terms_id)
              .maybeSingle();

          if (paymentTermError) {
            console.warn(
              "Failed to load quotation payment term wording:",
              paymentTermError,
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

        const typedLineItems = (lineItemsResult.data ||
          []) as unknown as QuotationLineItemRow[];
        const typedClientPO = (poResult.data || null) as ClientPORow | null;

        setQuotation(typedQuotation);
        setLineItems(typedLineItems);
        setLinkedClientPO(typedClientPO);

        if (typedQuotation) {
          setCounterpartyTypeDraft(
            typedQuotation.counterparty_type || "client",
          );
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
            typedQuotation.terms_and_conditions_snapshot || "",
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
            })),
          );
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load quotation.");
      } finally {
        setIsLoading(false);
      }
    },
    [id, loadArchiveItems],
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
            "id, name, legal_name, contact_person, company_email, personnel_email, company_phone, personnel_phone, currency_code, payment_terms_days, payment_terms_id, country, city, state_province, postal_code, address_line_1, address_line_2",
          )
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_companies")
          .select(
            "id, name, legal_name, contact_person, email, phone, currency_code, country, city, state_province, postal_code, address_line_1, address_line_2",
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
            "id, code, name, due_days, status, is_default, document_label, document_terms_text",
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
            "id, code, name, account_type, institution_name, masked_account_number, status, company_id, beneficiary_name, currency_code, swift_code, iban, bank_address, account_identifier_type, account_identifier_value, bank_name, country, city, postal_code, address_line_1, address_line_2, account_number",
          )
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_items")
          .select(
            "id, name, description, sales_price, currency_code, revenue_category_id, tax_code_id, unit_of_measure_id",
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
      setShippingTerms(
        (shippingTermsResult.data || []) as ShippingTermOption[],
      );
      setBankAccounts((bankAccountsResult.data || []) as BankAccountOption[]);
      setItems((itemsResult.data || []) as ItemOption[]);
      setTaxCodes((taxCodesResult.data || []) as TaxCodeOption[]);
      setUnitsOfMeasure(
        (unitsOfMeasureResult.data || []) as UnitOfMeasureOption[],
      );
      setRevenueCategories(
        (revenueCategoriesResult.data || []) as RevenueCategoryOption[],
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
        () => void loadQuotation(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_quotation_line_items",
          filter: `quotation_id=eq.${id}`,
        },
        () => void loadQuotation(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_client_purchase_orders",
        },
        () => void loadQuotation(true),
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
    [clientIdDraft, clients],
  );

  const selectedDraftCompany = useMemo(
    () => companies.find((company) => company.id === companyIdDraft) ?? null,
    [companies, companyIdDraft],
  );

  const selectedDraftProject = useMemo(
    () => projects.find((entry) => entry.id === projectIdDraft) ?? null,
    [projectIdDraft, projects],
  );

  const selectedDraftTask = useMemo(
    () => tasks.find((entry) => entry.id === taskIdDraft) ?? null,
    [taskIdDraft, tasks],
  );

  const selectedDraftCurrency = useMemo(
    () => currencies.find((entry) => entry.id === currencyIdDraft) ?? null,
    [currencies, currencyIdDraft],
  );

  const selectedDraftPaymentTerm = useMemo(
    () =>
      paymentTerms.find((entry) => entry.id === paymentTermsIdDraft) ?? null,
    [paymentTerms, paymentTermsIdDraft],
  );

  const selectedDraftShippingTerm = useMemo(
    () =>
      shippingTerms.find((entry) => entry.id === shippingTermIdDraft) ?? null,
    [shippingTermIdDraft, shippingTerms],
  );

  const filteredBankAccounts = useMemo(() => {
    if (!companyIdDraft) {
      return bankAccounts;
    }

    return bankAccounts.filter(
      (account) => !account.company_id || account.company_id === companyIdDraft,
    );
  }, [bankAccounts, companyIdDraft]);

  const selectedDraftBankAccount = useMemo(
    () => bankAccounts.find((entry) => entry.id === bankAccountIdDraft) ?? null,
    [bankAccountIdDraft, bankAccounts],
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
      0,
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
        (currency) =>
          currency.currency_code === selectedDraftClient.currency_code,
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
        issueDateDraft || new Date().toISOString().slice(0, 10),
      );
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

    const taskStillValid = filteredDraftTasks.some(
      (task) => task.id === taskIdDraft,
    );

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
    [loadArchiveItems, loadQuotation],
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
    [id, loadArchiveItems, navigate],
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
            (code) => code.id === selectedItem.tax_code_id,
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
        }),
      );
    },
    [items, taxCodes],
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
        toNumber(row.unit_price) >= 0,
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
        toNumber(row.unit_price) < 0,
    );

    if (hasInvalidLine) {
      setError(
        "Every quotation line must have a description or item name, quantity greater than 0, and unit price 0 or higher.",
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
        bankAccounts.find((account) => account.id === bankAccountIdDraft) ??
        null;

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

      const idsToDelete = existingIds.filter(
        (entryId) => !draftIds.includes(entryId),
      );

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
            taxCodes.find((code) => code.id === row.tax_code_id)?.rate_percent,
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
      <AixiaPage>
        <AixiaLoadingState
          title="Loading quotation"
          description="Loading quotation workspace and linked finance data."
        />
      </AixiaPage>
    );
  }

  if (!quotation || !totals) {
    return (
      <AixiaPage>
        <AixiaEmptyState
          icon={FileText}
          title="Quotation not found"
          description="The quotation record could not be loaded."
        />
      </AixiaPage>
    );
  }

  const printableCurrencyCode =
    selectedDraftCurrency?.currency_code || quotation.currency_code || "USD";

  const visibleArchiveItems = archiveItems.filter(
    (item) => item.status === archiveTab,
  );

  const archivedCount = archiveItems.filter(
    (item) => item.status === "archived",
  ).length;
  const deletedCount = archiveItems.filter(
    (item) => item.status === "deleted",
  ).length;

  const statusValue = getQuotationStatusLabel(quotation.status);
  const editableLabel = getEditableStatusLabel(canEditQuotation);

  return (
    <>
      <AixiaPage>
        <AixiaHero
          parentLabel="Quotations"
          parentPath="/finance/transactions/quotations"
          gradientTitle={quotation.quotation_number || "Quotation"}
          title="Workspace"
          subtitle="Customer commercial quotation detail"
          description="Manage the commercial quotation before client PO, proforma invoice, invoice, and payment. Editable negotiation data, downstream client PO context, archive lifecycle, and print output stay inside shared AiXia components."
          badges={[
            { label: "Quotation Workspace", tone: "cyan" },
            {
              label: statusValue,
              tone:
                quotation.status === "accepted"
                  ? "emerald"
                  : quotation.status === "rejected" ||
                      quotation.status === "deleted"
                    ? "rose"
                    : quotation.status === "converted"
                      ? "violet"
                      : "gold",
            },
            {
              label: editableLabel,
              tone: canEditQuotation ? "emerald" : "amber",
            },
            ...(linkedClientPO
              ? [{ label: "Linked Client PO", tone: "violet" as const }]
              : []),
          ]}
          statusCards={[
            {
              label: "Client",
              value:
                selectedDraftClient?.legal_name ||
                selectedDraftClient?.name ||
                quotation.client_legal_name_snapshot ||
                quotation.client_name_snapshot ||
                quotation.counterparty_name_snapshot ||
                "—",
              description: "Active commercial counterparty",
              icon: CheckCircle,
              tone: "cyan",
            },
            {
              label: "Total Value",
              value: formatFinanceMoney(
                financialSummary?.total,
                printableCurrencyCode,
              ),
              description: "Live value from quotation lines",
              icon: Wallet,
              tone: "emerald",
            },
          ]}
          actions={
            <AixiaActionStack>
              <AixiaButton
                type="button"
                variant="secondary"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
                Print
              </AixiaButton>

              {canMarkSent ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() => void handleMarkSent()}
                  disabled={isMarkingSent}
                >
                  <CheckCircle className="h-4 w-4" />
                  {isMarkingSent ? "Updating..." : "Mark as Sent"}
                </AixiaButton>
              ) : null}

              {canMarkAccepted ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() => void handleMarkAccepted()}
                  disabled={isMarkingAccepted}
                >
                  <CheckCircle className="h-4 w-4" />
                  {isMarkingAccepted ? "Updating..." : "Mark as Accepted"}
                </AixiaButton>
              ) : null}

              {canMarkRejected ? (
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => void handleMarkRejected()}
                  disabled={isMarkingRejected}
                >
                  <Trash2 className="h-4 w-4" />
                  {isMarkingRejected ? "Updating..." : "Reject"}
                </AixiaButton>
              ) : null}

              {linkedClientPO ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() =>
                    navigate(
                      `/finance/transactions/customer-pos/${linkedClientPO.id}`,
                    )
                  }
                >
                  <FileText className="h-4 w-4" />
                  Open Customer PO
                </AixiaButton>
              ) : quotation.status === "accepted" ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() =>
                    navigate(
                      `/finance/transactions/customer-pos/new?quotation_id=${quotation.id}`,
                    )
                  }
                >
                  <FileText className="h-4 w-4" />
                  Save Customer PO
                </AixiaButton>
              ) : null}

              {quotation.status !== "archived" &&
              quotation.status !== "deleted" ? (
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => void handleArchive()}
                  disabled={isArchiving}
                >
                  <Archive className="h-4 w-4" />
                  {isArchiving ? "Archiving..." : "Archive"}
                </AixiaButton>
              ) : null}

              {quotation.status !== "deleted" &&
              quotation.status !== "converted" ? (
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => void handleDelete()}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </AixiaButton>
              ) : null}
            </AixiaActionStack>
          }
        />

        <AixiaMetricGrid>
          <AixiaMetricCard
            label="Subtotal"
            value={formatFinanceMoney(
              financialSummary?.subtotal,
              printableCurrencyCode,
            )}
            description="Before discount and tax."
            icon={FileText}
            tone="cyan"
          />
          <AixiaMetricCard
            label="Discount"
            value={formatFinanceMoney(
              financialSummary?.discount,
              printableCurrencyCode,
            )}
            description="Commercial adjustment."
            icon={CheckCircle}
            tone="gold"
          />
          <AixiaMetricCard
            label="Tax"
            value={formatFinanceMoney(
              financialSummary?.tax,
              printableCurrencyCode,
            )}
            description="Calculated from line items."
            icon={CheckCircle}
            tone="violet"
          />
          <AixiaMetricCard
            label="Total"
            value={formatFinanceMoney(
              financialSummary?.total,
              printableCurrencyCode,
            )}
            description="Current quotation value."
            icon={Wallet}
            tone="emerald"
          />
        </AixiaMetricGrid>

        {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}

        <AixiaSmartLayout
          main={
            <>
              <AixiaSection
                title="Document Overview"
                description="Document identity, counterparty, dates, status, currency, and project context."
                icon={FileText}
                actions={
                  canEditQuotation ? (
                    <AixiaActionStack>
                      {editingOverview ? (
                        <>
                          <AixiaButton
                            type="button"
                            variant="primary"
                            onClick={() => void handleSaveDraftChanges()}
                            disabled={isSavingDraft}
                          >
                            <Save className="h-4 w-4" />
                            {isSavingDraft ? "Saving..." : "Save"}
                          </AixiaButton>
                          <AixiaButton
                            type="button"
                            variant="secondary"
                            onClick={() => setEditingOverview(false)}
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
                      )}
                    </AixiaActionStack>
                  ) : null
                }
              >
                <AixiaFormGrid columns="three">
                  <AixiaFormField>
                    <AixiaFieldLabel label="Counterparty Type" />
                    {editingOverview ? (
                      <AixiaSelectField
                        value={counterpartyTypeDraft}
                        onChange={(event) =>
                          setCounterpartyTypeDraft(event.target.value)
                        }
                      >
                        <option value="client">Client</option>
                        <option value="company">Intercompany</option>
                      </AixiaSelectField>
                    ) : (
                      <AixiaDisplayBlock
                        label="Counterparty Type"
                        value={
                          quotation.counterparty_type_snapshot ||
                          quotation.counterparty_type ||
                          "Client"
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Client" />
                    {editingOverview ? (
                      <AixiaSelectField
                        value={clientIdDraft}
                        onChange={(event) =>
                          setClientIdDraft(event.target.value)
                        }
                      >
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
                          quotation.client_legal_name_snapshot ||
                          quotation.client_name_snapshot ||
                          "—"
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Issuing Company" />
                    {editingOverview ? (
                      <AixiaSelectField
                        value={companyIdDraft}
                        onChange={(event) =>
                          setCompanyIdDraft(event.target.value)
                        }
                      >
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
                          quotation.company_legal_name_snapshot ||
                          quotation.company_name_snapshot ||
                          "—"
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Project" />
                    {editingOverview ? (
                      <AixiaSelectField
                        value={projectIdDraft}
                        onChange={(event) =>
                          setProjectIdDraft(event.target.value)
                        }
                      >
                        <option value="">No project</option>
                        {projects.map((projectItem) => (
                          <option key={projectItem.id} value={projectItem.id}>
                            {projectItem.name}
                          </option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaDisplayBlock
                        label="Project"
                        value={selectedDraftProject?.name || "—"}
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Task" />
                    {editingOverview ? (
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
                      <AixiaDisplayBlock
                        label="Task"
                        value={selectedDraftTask?.title || "—"}
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Currency" />
                    {editingOverview ? (
                      <AixiaSelectField
                        value={currencyIdDraft}
                        onChange={(event) =>
                          setCurrencyIdDraft(event.target.value)
                        }
                      >
                        <option value="">Select currency</option>
                        {currencies.map((currency) => (
                          <option key={currency.id} value={currency.id}>
                            {currency.currency_code} — {currency.currency_name}
                          </option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaDisplayBlock
                        label="Currency"
                        value={
                          selectedDraftCurrency
                            ? `${selectedDraftCurrency.currency_code} — ${selectedDraftCurrency.currency_name}`
                            : quotation.currency_code || "USD"
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Issue Date" />
                    {editingOverview ? (
                      <AixiaInputField
                        type="date"
                        value={issueDateDraft}
                        onChange={(event) =>
                          setIssueDateDraft(event.target.value)
                        }
                      />
                    ) : (
                      <AixiaDisplayBlock
                        label="Issue Date"
                        value={formatFinanceDate(quotation.issue_date)}
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Valid Until" />
                    {editingOverview ? (
                      <AixiaInputField
                        type="date"
                        value={validUntilDraft}
                        onChange={(event) =>
                          setValidUntilDraft(event.target.value)
                        }
                      />
                    ) : (
                      <AixiaDisplayBlock
                        label="Valid Until"
                        value={formatFinanceDate(quotation.valid_until)}
                      />
                    )}
                  </AixiaFormField>

                  <AixiaDisplayBlock
                    label="Status"
                    value={<AixiaStatusBadge value={quotation.status} />}
                  />
                </AixiaFormGrid>
              </AixiaSection>

              <AixiaSection
                title="Financial Settings"
                description="Payment terms, shipping terms, and issuing bank account from finance master data."
                icon={CheckCircle}
                actions={
                  canEditQuotation ? (
                    <AixiaActionStack>
                      {editingFinancialSettings ? (
                        <>
                          <AixiaButton
                            type="button"
                            variant="primary"
                            onClick={() => void handleSaveDraftChanges()}
                            disabled={isSavingDraft}
                          >
                            <Save className="h-4 w-4" />
                            {isSavingDraft ? "Saving..." : "Save"}
                          </AixiaButton>
                          <AixiaButton
                            type="button"
                            variant="secondary"
                            onClick={() => setEditingFinancialSettings(false)}
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
                      )}
                    </AixiaActionStack>
                  ) : null
                }
              >
                <AixiaFormGrid columns="two">
                  <AixiaFormField>
                    <AixiaFieldLabel label="Payment Terms" />
                    {editingFinancialSettings ? (
                      <AixiaSelectField
                        value={paymentTermsIdDraft}
                        onChange={(event) =>
                          setPaymentTermsIdDraft(event.target.value)
                        }
                      >
                        <option value="">Select payment terms</option>
                        {paymentTerms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {term.document_label || term.name}
                          </option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaDisplayBlock
                        label="Payment Terms"
                        value={
                          getPaymentTermLabel(selectedDraftPaymentTerm) !== "—"
                            ? getPaymentTermLabel(selectedDraftPaymentTerm)
                            : quotation.payment_terms_snapshot || "—"
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Shipping Terms" />
                    {editingFinancialSettings ? (
                      <AixiaSelectField
                        value={shippingTermIdDraft}
                        onChange={(event) =>
                          setShippingTermIdDraft(event.target.value)
                        }
                      >
                        <option value="">Select shipping terms</option>
                        {shippingTerms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {term.code} — {term.name}
                          </option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaDisplayBlock
                        label="Shipping Terms"
                        value={
                          getShippingTermLabel(selectedDraftShippingTerm) !==
                          "—"
                            ? getShippingTermLabel(selectedDraftShippingTerm)
                            : quotation.shipping_terms_snapshot || "—"
                        }
                      />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Bank Account" />
                    {editingFinancialSettings ? (
                      <AixiaSelectField
                        value={bankAccountIdDraft}
                        onChange={(event) =>
                          setBankAccountIdDraft(event.target.value)
                        }
                      >
                        <option value="">Select bank account</option>
                        {filteredBankAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {getBankAccountLabel(account)}
                          </option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaDisplayBlock
                        label="Bank Account"
                        value={getBankDisplayName(selectedDraftBankAccount)}
                      />
                    )}
                  </AixiaFormField>

                  <AixiaDisplayBlock
                    label="Bank Details"
                    value={bankDetailsText || "—"}
                  />
                </AixiaFormGrid>
              </AixiaSection>

              <AixiaSection
                title="Document Details"
                description="Company, recipient, terms, notes, and terms-and-conditions snapshots."
                icon={CheckCircle}
                actions={
                  canEditQuotation ? (
                    <AixiaActionStack>
                      {editingDocumentDetails ? (
                        <>
                          <AixiaButton
                            type="button"
                            variant="primary"
                            onClick={() => void handleSaveDraftChanges()}
                            disabled={isSavingDraft}
                          >
                            <Save className="h-4 w-4" />
                            {isSavingDraft ? "Saving..." : "Save"}
                          </AixiaButton>
                          <AixiaButton
                            type="button"
                            variant="secondary"
                            onClick={() => setEditingDocumentDetails(false)}
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
                      )}
                    </AixiaActionStack>
                  ) : null
                }
              >
                <AixiaReviewGrid variant="cards">
                  <AixiaReviewBlock
                    label="Issuing Company"
                    value={
                      selectedDraftCompany?.legal_name ||
                      selectedDraftCompany?.name ||
                      quotation.company_legal_name_snapshot ||
                      quotation.company_name_snapshot ||
                      "—"
                    }
                    description={
                      companyAddress ||
                      quotation.company_email_snapshot ||
                      "No company address saved."
                    }
                    tone="cyan"
                  />
                  <AixiaReviewBlock
                    label="Recipient"
                    value={
                      selectedDraftClient?.legal_name ||
                      selectedDraftClient?.name ||
                      quotation.client_legal_name_snapshot ||
                      quotation.client_name_snapshot ||
                      quotation.counterparty_name_snapshot ||
                      "—"
                    }
                    description={
                      clientAddress ||
                      quotation.client_email_snapshot ||
                      "No recipient address saved."
                    }
                    tone="emerald"
                  />
                  <AixiaReviewBlock
                    label="Payment Terms"
                    value={
                      quotation.payment_terms_snapshot ||
                      getPaymentTermLabel(selectedDraftPaymentTerm)
                    }
                    description={
                      quotation.payment_terms_document_text ||
                      "Document payment wording."
                    }
                    tone="amber"
                  />
                  <AixiaReviewBlock
                    label="Shipping Terms"
                    value={
                      quotation.shipping_terms_snapshot ||
                      getShippingTermLabel(selectedDraftShippingTerm)
                    }
                    description={`Currency: ${printableCurrencyCode}`}
                    tone="violet"
                  />
                </AixiaReviewGrid>

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Notes" />
                  <AixiaDisplayBlock
                    label="Notes"
                    value={quotation.notes || "—"}
                  />
                </AixiaFormFullWidth>

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Terms & Conditions" />
                  {editingDocumentDetails ? (
                    <AixiaTextareaField
                      value={termsAndConditionsDraft}
                      onChange={(event) =>
                        setTermsAndConditionsDraft(event.target.value)
                      }
                      rows={7}
                    />
                  ) : (
                    <AixiaDisplayBlock
                      label="Terms & Conditions"
                      value={quotation.terms_and_conditions_snapshot || "—"}
                    />
                  )}
                </AixiaFormFullWidth>
              </AixiaSection>

              <AixiaSection
                title="Line Items"
                description="Quotation lines stay editable through negotiation, including accepted quotations."
                icon={SquarePen}
                smartScroll
                itemCount={(editingLines ? lineItemsDraft : lineItems).length}
                actions={
                  <AixiaActionStack>
                    {editingLines ? (
                      <AixiaButton
                        type="button"
                        variant="primary"
                        onClick={() => void handleSaveDraftChanges()}
                        disabled={isSavingDraft}
                      >
                        <Save className="h-4 w-4" />
                        {isSavingDraft ? "Saving..." : "Save"}
                      </AixiaButton>
                    ) : null}
                    {editingLines && canEditQuotation ? (
                      <AixiaButton
                        type="button"
                        variant="secondary"
                        onClick={addDraftLineItem}
                      >
                        Add Row
                      </AixiaButton>
                    ) : null}
                    {canEditQuotation ? (
                      <AixiaButton
                        type="button"
                        variant="primary"
                        onClick={() => setEditingLines((current) => !current)}
                      >
                        <SquarePen className="h-4 w-4" />
                        {editingLines ? "Close" : "Edit"}
                      </AixiaButton>
                    ) : null}
                  </AixiaActionStack>
                }
              >
                {(editingLines ? lineItemsDraft : lineItems).map(
                  (row, index) => {
                    const editable = editingLines;
                    const editableRow = row as EditableLineItem;
                    const readOnlyRow = row as QuotationLineItemRow;
                    const editableBase = Math.max(
                      toNumber(editableRow.quantity) *
                        toNumber(editableRow.unit_price) -
                        (toNumber(editableRow.discount) > 0
                          ? toNumber(editableRow.discount)
                          : toNumber(editableRow.quantity) *
                            toNumber(editableRow.unit_price) *
                            (toNumber(editableRow.discount_rate) / 100)),
                      0,
                    );
                    const editableTaxRate =
                      taxCodes.find(
                        (entry) => entry.id === editableRow.tax_code_id,
                      )?.rate_percent ?? toNumber(editableRow.tax_rate);
                    const rowTotal = editable
                      ? editableBase +
                        editableBase * (toNumber(String(editableTaxRate)) / 100)
                      : toNumber(readOnlyRow.line_total);

                    return (
                      <AixiaFormRowCard
                        key={
                          (row as EditableLineItem | QuotationLineItemRow).id
                        }
                        title={`Line ${index + 1}`}
                        description={
                          editable
                            ? "Editable quotation line"
                            : readOnlyRow.item_name ||
                              readOnlyRow.description ||
                              "Quotation line"
                        }
                        onRemove={
                          editable && canEditQuotation
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
                                  applyDraftItemSelection(
                                    editableRow.id,
                                    event.target.value,
                                  )
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
                              <AixiaDisplayBlock
                                label="Item"
                                value={readOnlyRow.item_name || "—"}
                              />
                            )}
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Description" />
                            {editable ? (
                              <AixiaInputField
                                value={editableRow.description}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === editableRow.id
                                        ? {
                                            ...entry,
                                            description: event.target.value,
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                              />
                            ) : (
                              <AixiaDisplayBlock
                                label="Description"
                                value={readOnlyRow.description || "—"}
                              />
                            )}
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Quantity" />
                            {editable ? (
                              <AixiaInputField
                                value={editableRow.quantity}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === editableRow.id
                                        ? {
                                            ...entry,
                                            quantity: event.target.value,
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                              />
                            ) : (
                              <AixiaDisplayBlock
                                label="Quantity"
                                value={toNumber(readOnlyRow.quantity)}
                              />
                            )}
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Unit Price" />
                            {editable ? (
                              <AixiaInputField
                                value={editableRow.unit_price}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === editableRow.id
                                        ? {
                                            ...entry,
                                            unit_price: event.target.value,
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                              />
                            ) : (
                              <AixiaDisplayBlock
                                label="Unit Price"
                                value={formatFinanceMoney(
                                  toNumber(readOnlyRow.unit_price),
                                  printableCurrencyCode,
                                )}
                              />
                            )}
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Discount %" />
                            {editable ? (
                              <AixiaInputField
                                value={editableRow.discount_rate}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === editableRow.id
                                        ? {
                                            ...entry,
                                            discount_rate: event.target.value,
                                            discount: "0",
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                              />
                            ) : (
                              <AixiaDisplayBlock
                                label="Discount"
                                value={`${toNumber(readOnlyRow.discount_rate).toFixed(2)}%`}
                              />
                            )}
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Tax Code" />
                            {editable ? (
                              <AixiaSelectField
                                value={editableRow.tax_code_id}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === editableRow.id
                                        ? {
                                            ...entry,
                                            tax_code_id: event.target.value,
                                            tax_rate: String(
                                              taxCodes.find(
                                                (code) =>
                                                  code.id ===
                                                  event.target.value,
                                              )?.rate_percent ?? 0,
                                            ),
                                          }
                                        : entry,
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
                                label="Tax"
                                value={`${toNumber(readOnlyRow.tax_rate).toFixed(2)}%`}
                              />
                            )}
                          </AixiaFormField>

                          <AixiaDisplayBlock
                            label="Line Total"
                            value={formatFinanceMoney(
                              rowTotal,
                              printableCurrencyCode,
                            )}
                          />
                        </AixiaFormGrid>
                      </AixiaFormRowCard>
                    );
                  },
                )}
              </AixiaSection>
            </>
          }
          side={
            <>
              <AixiaSection
                title="Financial Summary"
                description="Live quotation totals."
                icon={Wallet}
              >
                <AixiaReviewGrid variant="stack">
                  <AixiaReviewBlock
                    label="Subtotal"
                    value={formatFinanceMoney(
                      financialSummary?.subtotal,
                      printableCurrencyCode,
                    )}
                    tone="cyan"
                  />
                  <AixiaReviewBlock
                    label="Discount"
                    value={formatFinanceMoney(
                      financialSummary?.discount,
                      printableCurrencyCode,
                    )}
                    tone="amber"
                  />
                  <AixiaReviewBlock
                    label="Tax"
                    value={formatFinanceMoney(
                      financialSummary?.tax,
                      printableCurrencyCode,
                    )}
                    tone="violet"
                  />
                  <AixiaReviewBlock
                    label="Total"
                    value={formatFinanceMoney(
                      financialSummary?.total,
                      printableCurrencyCode,
                    )}
                    tone="emerald"
                  />
                </AixiaReviewGrid>
              </AixiaSection>

              <AixiaSection
                title="Linked Client PO"
                description="Downstream client purchase order created from this quotation."
                icon={Link2}
              >
                {!linkedClientPO ? (
                  <AixiaEmptyState
                    icon={Link2}
                    title="No linked client PO"
                    description="No client purchase order has been saved from this quotation yet."
                  />
                ) : (
                  <AixiaActionCard
                    label="Client PO"
                    value={linkedClientPO.client_po_number || "Client PO"}
                    description={`Status: ${linkedClientPO.status || "—"}`}
                    icon={FileText}
                    tone="violet"
                    actionLabel="Open"
                    onClick={() =>
                      navigate(
                        `/finance/transactions/customer-pos/${linkedClientPO.id}`,
                      )
                    }
                    meta={[
                      {
                        label: "External",
                        value: linkedClientPO.external_po_number || "—",
                      },
                      {
                        label: "Received",
                        value: formatFinanceDate(linkedClientPO.received_at),
                      },
                      {
                        label: "Amount",
                        value: formatFinanceMoney(
                          linkedClientPO.total_amount,
                          printableCurrencyCode,
                        ),
                      },
                    ]}
                  />
                )}
              </AixiaSection>

              <AixiaSection
                title="Archive Center"
                description="Open archived and deleted quotation records."
                icon={Archive}
              >
                <AixiaActionCard
                  label="Archive"
                  value={`${archiveItems.length} records`}
                  description="Archived records can be restored. Deleted records can be restored or permanently deleted."
                  icon={Archive}
                  tone="rose"
                  actionLabel="Open Archive"
                  onClick={() => setShowArchivePopup(true)}
                />
              </AixiaSection>
            </>
          }
          sidebar="narrow"
          bottomSpan="auto"
          sideRebalance="last-to-bottom"
        />

        <AixiaArchiveManagerModal
          open={showArchivePopup}
          title="Quotation Archive"
          description="Archived records can be restored. Deleted records can be restored or permanently deleted."
          archivedCount={archivedCount}
          deletedCount={deletedCount}
          activeTab={archiveTab}
          onTabChange={setArchiveTab}
          onClose={() => setShowArchivePopup(false)}
          maxWidthClassName="max-w-6xl"
        >
          {visibleArchiveItems.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title={`No ${archiveTab} quotations`}
              description={`There are no ${archiveTab} quotation records to show.`}
            />
          ) : (
            <AixiaTableShell
              variant="archive"
              minWidthClassName="min-w-[1020px]"
            >
              <thead>
                <tr>
                  <th>Quotation No.</th>
                  <th>Client</th>
                  <th>Company</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleArchiveItems.map((item) => (
                  <tr key={item.id}>
                    <AixiaTableTextCell
                      primary={item.quotation_number || "Quotation"}
                      secondary={item.id}
                      width="lg"
                    />
                    <AixiaTableTextCell
                      primary={item.client_name_snapshot || "—"}
                      width="lg"
                    />
                    <AixiaTableTextCell
                      primary={item.company_name_snapshot || "—"}
                      width="lg"
                    />
                    <AixiaTableTextCell
                      primary={formatFinanceMoney(
                        item.total_amount,
                        printableCurrencyCode,
                      )}
                      width="md"
                    />
                    <AixiaTableBadgeCell>
                      <AixiaStatusBadge value={item.status} />
                    </AixiaTableBadgeCell>
                    <AixiaTableDateCell>
                      {formatFinanceDate(item.updated_at)}
                    </AixiaTableDateCell>
                    <AixiaTableActionsCell>
                      <AixiaButton
                        type="button"
                        variant="primary"
                        onClick={() =>
                          navigate(
                            `/finance/transactions/quotations/${item.id}`,
                          )
                        }
                      >
                        <Eye className="h-4 w-4" />
                        Open
                      </AixiaButton>
                      <AixiaButton
                        type="button"
                        variant="secondary"
                        onClick={() => void handleRestore(item.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </AixiaButton>
                      {archiveTab === "deleted" ? (
                        <AixiaButton
                          type="button"
                          variant="danger"
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

      <div className="aixia-print-only">
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
