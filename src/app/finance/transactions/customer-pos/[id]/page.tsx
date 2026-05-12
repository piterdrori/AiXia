"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  CheckCircle,
  Eye,
  FileText,
  Link2,
  Paperclip,
  Plus,
  RotateCcw,
  Save,
  SquarePen,
  Trash2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  AixiaAlert,
  AixiaButton,
  AixiaDetailSection,
  AixiaDisplayBlock,
  AixiaDocumentUploadPanel,
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
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaStatusBadge,
  AixiaTextareaField,
} from "@/components/aixia";

type CustomerPoStatus =
  | "draft"
  | "received"
  | "verified"
  | "linked_to_pi"
  | "closed"
  | "canceled"
  | "archived"
  | "deleted";

type CustomerPoRow = {
  id: string;
  client_po_number: string | null;
  external_po_number: string | null;
  quotation_id: string | null;
  proforma_invoice_id: string | null;
  client_id: string | null;
  company_id: string | null;
  po_date: string | null;
  received_at: string | null;
  verified_at: string | null;
  linked_to_pi_at: string | null;
  closed_at: string | null;
  canceled_at: string | null;
  archived_at: string | null;
  status: CustomerPoStatus;
  currency_id: string | null;
  currency_code: string | null;
  total_amount: number | string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  document_version: number;
  project_id: string | null;
  task_id: string | null;
  reference_number: string | null;
  posted_to_ledger: boolean;
  company_name_snapshot: string | null;
  company_legal_name_snapshot: string | null;
  company_contact_person_snapshot: string | null;
  company_email_snapshot: string | null;
  company_phone_snapshot: string | null;
  company_address_snapshot: string | null;
  client_name_snapshot: string | null;
  client_legal_name_snapshot: string | null;
  client_contact_person_snapshot: string | null;
  client_email_snapshot: string | null;
  client_phone_snapshot: string | null;
  billing_address_snapshot: string | null;
  shipping_address_snapshot: string | null;
  counterparty_type: string | null;
  counterparty_company_id: string | null;
  is_intercompany: boolean;
  counterparty_name_snapshot: string | null;
  counterparty_legal_name_snapshot: string | null;
  counterparty_contact_person_snapshot: string | null;
  counterparty_email_snapshot: string | null;
  counterparty_phone_snapshot: string | null;
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
  currency_name: string | null;
};

type ProjectOption = {
  id: string;
  name: string;
};

type TaskOption = {
  id: string;
  title: string;
  project_id: string | null;
};

type QuotationOption = {
  id: string;
  quotation_number: string | null;
  client_id: string | null;
  company_id: string | null;
  currency_id: string | null;
  currency_code: string | null;
  total_amount: number | string | null;
  project_id: string | null;
  task_id: string | null;
  status: string | null;
};

type ProformaOption = {
  id: string;
  proforma_number: string | null;
  status: string | null;
  total_amount: number | string | null;
  currency_code: string | null;
};

type QuotationLineOption = {
  id: string;
  quotation_id: string;
  item_id: string | null;
  item_name: string | null;
  description: string | null;
  quantity: number | string | null;
  unit_price: number | string | null;
  tax_rate: number | string | null;
  discount_rate: number | string | null;
  line_discount_amount: number | string | null;
  line_total: number | string | null;
  tax_code_id: string | null;
  unit_of_measure_id: string | null;
  revenue_category_id: string | null;
};

type CustomerPoAttachment = {
  id: string;
  entity_id: string;
  created_at: string | null;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
};

type CustomerPoLineItem = {
  id: string;
  client_po_id: string;
  item_id: string | null;
  description: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  discount: number | string | null;
  line_total: number | string | null;
  sort_order: number | null;
  unit_of_measure_id: string | null;
  tax_code_id: string | null;
  revenue_category_id: string | null;
  project_id: string | null;
  task_id: string | null;
  status: string;
  notes: string | null;
  item?: {
    name: string | null;
  } | null;
  finance_units_of_measure?: {
    code: string | null;
    name: string | null;
  } | null;
  finance_tax_codes?: {
    code: string | null;
    name: string | null;
    rate_percent: number | string | null;
  } | null;
  finance_revenue_categories?: {
    code: string | null;
    name: string;
  } | null;
};

type ItemOption = {
  id: string;
  name: string;
  description: string | null;
  sales_price: number | string | null;
  revenue_category_id: string | null;
  tax_code_id: string | null;
  unit_of_measure_id: string | null;
};

type TaxCodeOption = {
  id: string;
  code: string;
  name: string;
  rate_percent: number | string | null;
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

type CustomerPoEditDraft = {
  client_id: string;
  quotation_id: string;
  external_po_number: string;
  company_id: string;
  po_date: string;
  received_date: string;
  currency_id: string;
  currency_code: string;
  project_id: string;
  task_id: string;
  notes: string;
};

type CustomerPoLineDraft = {
  localId: string;
  sourceId: string | null;
  item_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount: string;
  tax_code_id: string;
  unit_of_measure_id: string;
  revenue_category_id: string;
  notes: string;
};

function createLineDraft(): CustomerPoLineDraft {
  return {
    localId: crypto.randomUUID(),
    sourceId: null,
    item_id: "",
    description: "",
    quantity: "1",
    unit_price: "0",
    discount: "0",
    tax_code_id: "",
    unit_of_measure_id: "",
    revenue_category_id: "",
    notes: "",
  };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(
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

function formatDate(value: string | null | undefined) {
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

function makeAddressSnapshot(row: ClientOption | CompanyOption | null | undefined) {
  if (!row) return null;

  return (
    [
      row.address_line_1,
      row.address_line_2,
      row.city,
      row.state_province,
      row.postal_code,
      row.country,
    ]
      .filter(Boolean)
      .join(", ") || null
  );
}

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export default function FinanceCustomerPoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customerPo, setCustomerPo] = useState<CustomerPoRow | null>(null);
  const [quotation, setQuotation] = useState<QuotationOption | null>(null);
  const [proforma, setProforma] = useState<ProformaOption | null>(null);
  const [attachments, setAttachments] = useState<CustomerPoAttachment[]>([]);
  const [lineItems, setLineItems] = useState<CustomerPoLineItem[]>([]);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [quotations, setQuotations] = useState<QuotationOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([]);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasureOption[]>([]);
  const [revenueCategories, setRevenueCategories] = useState<RevenueCategoryOption[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingLines, setIsEditingLines] = useState(false);

  const [editDraft, setEditDraft] = useState<CustomerPoEditDraft>({
    client_id: "",
    quotation_id: "",
    external_po_number: "",
    company_id: "",
    po_date: "",
    received_date: "",
    currency_id: "",
    currency_code: "",
    project_id: "",
    task_id: "",
    notes: "",
  });

  const [lineDrafts, setLineDrafts] = useState<CustomerPoLineDraft[]>([
    createLineDraft(),
  ]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLookups, setIsLoadingLookups] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const loadLookups = useCallback(async () => {
    setIsLoadingLookups(true);

    try {
      const [
        clientsResult,
        companiesResult,
        currenciesResult,
        projectsResult,
        tasksResult,
        quotationsResult,
        itemsResult,
        taxCodesResult,
        unitsResult,
        revenueCategoriesResult,
      ] = await Promise.all([
        supabase
          .from("finance_clients")
          .select(
            "id, name, legal_name, contact_person, company_email, personnel_email, company_phone, personnel_phone, country, city, state_province, postal_code, address_line_1, address_line_2"
          )
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_companies")
          .select(
            "id, name, legal_name, contact_person, email, phone, country, city, state_province, postal_code, address_line_1, address_line_2"
          )
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_currencies")
          .select("id, currency_code, currency_name")
          .eq("status", "active")
          .order("currency_code", { ascending: true }),

        supabase.from("projects").select("id, name").order("name", { ascending: true }),

        supabase
          .from("tasks")
          .select("id, title, project_id")
          .order("created_at", { ascending: false }),

        supabase
          .from("finance_quotations")
          .select(
            "id, quotation_number, client_id, company_id, currency_id, currency_code, total_amount, project_id, task_id, status"
          )
          .not("status", "in", "(archived,deleted)")
          .order("created_at", { ascending: false }),

        supabase
          .from("finance_items")
          .select(
            "id, name, description, sales_price, revenue_category_id, tax_code_id, unit_of_measure_id"
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
      if (currenciesResult.error) throw currenciesResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (tasksResult.error) throw tasksResult.error;
      if (quotationsResult.error) throw quotationsResult.error;
      if (itemsResult.error) throw itemsResult.error;
      if (taxCodesResult.error) throw taxCodesResult.error;
      if (unitsResult.error) throw unitsResult.error;
      if (revenueCategoriesResult.error) throw revenueCategoriesResult.error;

      setClients((clientsResult.data || []) as ClientOption[]);
      setCompanies((companiesResult.data || []) as CompanyOption[]);
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
      setProjects((projectsResult.data || []) as ProjectOption[]);
      setTasks((tasksResult.data || []) as TaskOption[]);
      setQuotations((quotationsResult.data || []) as QuotationOption[]);
      setItems((itemsResult.data || []) as ItemOption[]);
      setTaxCodes((taxCodesResult.data || []) as TaxCodeOption[]);
      setUnitsOfMeasure((unitsResult.data || []) as UnitOfMeasureOption[]);
      setRevenueCategories((revenueCategoriesResult.data || []) as RevenueCategoryOption[]);
    } catch (err) {
      console.error(err);
      setError("Failed to load Customer PO lookup data.");
    } finally {
      setIsLoadingLookups(false);
    }
  }, []);

  const resetEditDraftFromPo = useCallback((po: CustomerPoRow) => {
    setEditDraft({
      client_id: po.client_id || "",
      quotation_id: po.quotation_id || "",
      external_po_number: po.external_po_number || "",
      company_id: po.company_id || "",
      po_date: getDateInputValue(po.po_date),
      received_date: getDateInputValue(po.received_at),
      currency_id: po.currency_id || "",
      currency_code: po.currency_code || "",
      project_id: po.project_id || "",
      task_id: po.task_id || "",
      notes: po.notes || "",
    });
  }, []);

  const resetLineDraftsFromRows = useCallback((rows: CustomerPoLineItem[]) => {
    setLineDrafts(
      rows.length > 0
        ? rows.map((line) => ({
            localId: crypto.randomUUID(),
            sourceId: line.id,
            item_id: line.item_id || "",
            description: line.description || "",
            quantity: String(line.quantity ?? 1),
            unit_price: String(line.unit_price ?? 0),
            discount: String(line.discount ?? 0),
            tax_code_id: line.tax_code_id || "",
            unit_of_measure_id: line.unit_of_measure_id || "",
            revenue_category_id: line.revenue_category_id || "",
            notes: line.notes || "",
          }))
        : [createLineDraft()]
    );
  }, []);

  const loadCustomerPo = useCallback(async () => {
    if (!id) return;

    setError("");

    try {
      const { data: poData, error: poError } = await supabase
        .from("finance_client_purchase_orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (poError) throw poError;

      const typedPo = (poData || null) as CustomerPoRow | null;
      setCustomerPo(typedPo);

      if (typedPo && !isEditingDetails) {
        resetEditDraftFromPo(typedPo);
      }

      if (typedPo?.quotation_id) {
        const { data: quotationData, error: quotationError } = await supabase
          .from("finance_quotations")
          .select(
            "id, quotation_number, client_id, company_id, currency_id, currency_code, total_amount, project_id, task_id, status"
          )
          .eq("id", typedPo.quotation_id)
          .maybeSingle();

        if (quotationError) throw quotationError;
        setQuotation((quotationData || null) as QuotationOption | null);
      } else {
        setQuotation(null);
      }

          if (typedPo?.proforma_invoice_id) {
        const { data: proformaData, error: proformaError } = await supabase
          .from("finance_proforma_invoices")
          .select("id, proforma_number, status, total_amount, currency_code")
          .eq("id", typedPo.proforma_invoice_id)
          .maybeSingle();

        if (proformaError) throw proformaError;
        setProforma((proformaData || null) as ProformaOption | null);
      } else {
        setProforma(null);
      }

      const { data: attachmentData, error: attachmentError } = await supabase
        .from("finance_record_attachments")
        .select(
          `
          id,
          entity_id,
          created_at,
          file_uploads (
            file_name,
            file_path,
            file_size,
            mime_type
          )
        `
        )
        .eq("entity_type", "finance_client_purchase_order")
        .eq("entity_id", id)
        .order("created_at", { ascending: false });

      if (attachmentError) throw attachmentError;

      const mappedAttachments = ((attachmentData || []) as Array<{
        id: string;
        entity_id: string | number | null;
        created_at: string | null;
        file_uploads?: {
          file_name?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
        } | null;
      }>).map((row) => ({
        id: row.id,
        entity_id: String(row.entity_id || ""),
        created_at: row.created_at || null,
        file_name: row.file_uploads?.file_name || null,
        file_path: row.file_uploads?.file_path || null,
        file_size: row.file_uploads?.file_size || null,
        mime_type: row.file_uploads?.mime_type || null,
      }));

      setAttachments(mappedAttachments);

      const { data: lineItemData, error: lineItemError } = await supabase
        .from("finance_client_purchase_order_line_items")
        .select(
          `
          id,
          client_po_id,
          item_id,
          description,
          quantity,
          unit_price,
          discount,
          line_total,
          sort_order,
          unit_of_measure_id,
          tax_code_id,
          revenue_category_id,
          project_id,
          task_id,
          status,
          notes,
          item:finance_items (
            name
          ),
          finance_units_of_measure (
            code,
            name
          ),
          finance_tax_codes (
            code,
            name,
            rate_percent
          ),
          finance_revenue_categories (
            code,
            name
          )
        `
        )
        .eq("client_po_id", id)
        .or("status.is.null,status.neq.deleted")
        .order("sort_order", { ascending: true });

      if (lineItemError) throw lineItemError;

      const typedLineItems =
        (lineItemData || []) as unknown as CustomerPoLineItem[];

      setLineItems(typedLineItems);

      if (!isEditingLines) {
        resetLineDraftsFromRows(typedLineItems);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load Customer PO.");
    } finally {
      setIsLoading(false);
    }
  }, [
    id,
    isEditingDetails,
    isEditingLines,
    resetEditDraftFromPo,
    resetLineDraftsFromRows,
  ]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    void loadCustomerPo();
  }, [loadCustomerPo]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`finance-customer-po-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_client_purchase_orders",
          filter: `id=eq.${id}`,
        },
        () => void loadCustomerPo()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${id}`,
        },
        () => void loadCustomerPo()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_client_purchase_order_line_items",
          filter: `client_po_id=eq.${id}`,
        },
        () => void loadCustomerPo()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadCustomerPo();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [id, loadCustomerPo]);

  const selectedQuotation = useMemo(
    () =>
      quotations.find((quotationItem) => quotationItem.id === editDraft.quotation_id) ||
      quotation ||
      null,
    [editDraft.quotation_id, quotation, quotations]
  );

  const selectedCurrency = useMemo(
    () =>
      currencies.find((currency) => currency.id === editDraft.currency_id) || null,
    [currencies, editDraft.currency_id]
  );

  const filteredQuotations = useMemo(() => {
    if (!editDraft.client_id) return quotations;

    return quotations.filter(
      (quotationItem) =>
        quotationItem.client_id === editDraft.client_id ||
        quotationItem.id === editDraft.quotation_id
    );
  }, [editDraft.client_id, editDraft.quotation_id, quotations]);

  const filteredTasks = useMemo(() => {
    if (!editDraft.project_id) return tasks;
    return tasks.filter((task) => task.project_id === editDraft.project_id);
  }, [editDraft.project_id, tasks]);

  const displayedCurrencyCode =
    editDraft.currency_code ||
    selectedCurrency?.currency_code ||
    customerPo?.currency_code ||
    "USD";

  const draftTotals = useMemo(() => {
    const subtotal = lineDrafts.reduce(
      (sum, row) => sum + toNumber(row.quantity) * toNumber(row.unit_price),
      0
    );

    const discount = lineDrafts.reduce(
      (sum, row) => sum + toNumber(row.discount),
      0
    );

    const tax = lineDrafts.reduce((sum, row) => {
      const base = Math.max(
        toNumber(row.quantity) * toNumber(row.unit_price) -
          toNumber(row.discount),
        0
      );

      const taxCode = taxCodes.find((entry) => entry.id === row.tax_code_id);
      if (!taxCode) return sum;

      return sum + base * (toNumber(taxCode.rate_percent) / 100);
    }, 0);

    return {
      subtotal,
      discount,
      tax,
      total: Math.max(subtotal - discount + tax, 0),
    };
  }, [lineDrafts, taxCodes]);

  const hasCustomerPoFile = attachments.length > 0;

  const lineSubtotal = isEditingLines
    ? draftTotals.subtotal
    : lineItems.reduce(
        (sum, line) => sum + toNumber(line.quantity) * toNumber(line.unit_price),
        0
      );

  const lineDiscount = isEditingLines
    ? draftTotals.discount
    : lineItems.reduce((sum, line) => sum + toNumber(line.discount), 0);

  const lineTotal = isEditingLines
    ? draftTotals.total
    : lineItems.reduce((sum, line) => sum + toNumber(line.line_total), 0);

  const lineTax = isEditingLines
    ? draftTotals.tax
    : Math.max(lineTotal - (lineSubtotal - lineDiscount), 0);

  const canEditDetails =
    customerPo?.status !== "archived" && customerPo?.status !== "deleted";

  const totalDisplayValue = isEditingLines
    ? draftTotals.total
    : customerPo?.total_amount || lineTotal;

  function resetEditDraft() {
    if (!customerPo) return;
    resetEditDraftFromPo(customerPo);
  }

  function resetLineDrafts() {
    resetLineDraftsFromRows(lineItems);
  }

  function handleClientChange(clientId: string) {
    setEditDraft((current) => ({
      ...current,
      client_id: clientId,
      quotation_id: "",
    }));
  }

  async function handleQuotationChange(quotationId: string) {
    const quotationItem = quotations.find((entry) => entry.id === quotationId);

    if (!quotationItem) {
      setEditDraft((current) => ({
        ...current,
        quotation_id: "",
      }));

      return;
    }

    const matchedCurrency = currencies.find(
      (currency) =>
        currency.id === quotationItem.currency_id ||
        currency.currency_code === quotationItem.currency_code
    );

    setEditDraft((current) => ({
      ...current,
      quotation_id: quotationItem.id,
      client_id: quotationItem.client_id || current.client_id,
      company_id: quotationItem.company_id || current.company_id,
      currency_id: matchedCurrency?.id || current.currency_id,
      currency_code:
        matchedCurrency?.currency_code ||
        quotationItem.currency_code ||
        current.currency_code,
      project_id: quotationItem.project_id || current.project_id,
      task_id: quotationItem.task_id || current.task_id,
    }));

    const { data, error: linesError } = await supabase
      .from("finance_quotation_line_items")
      .select(
        "id, quotation_id, item_id, item_name, description, quantity, unit_price, tax_rate, discount_rate, line_discount_amount, line_total, tax_code_id, unit_of_measure_id, revenue_category_id"
      )
      .eq("quotation_id", quotationItem.id)
      .order("sort_order", { ascending: true });

    if (linesError) {
      console.error(linesError);
      setError("Failed to load quotation line items.");
      return;
    }

    const quotationLines = (data || []) as QuotationLineOption[];

    if (quotationLines.length > 0) {
      setLineDrafts(
        quotationLines.map((line) => ({
          localId: crypto.randomUUID(),
          sourceId: null,
          item_id: line.item_id || "",
          description: line.description || line.item_name || "",
          quantity: String(line.quantity ?? 1),
          unit_price: String(line.unit_price ?? 0),
          discount: String(line.line_discount_amount ?? 0),
          tax_code_id: line.tax_code_id || "",
          unit_of_measure_id: line.unit_of_measure_id || "",
          revenue_category_id: line.revenue_category_id || "",
          notes: "",
        }))
      );
      setIsEditingLines(true);
    }
  }

  function handleCurrencyChange(currencyId: string) {
    const currency = currencies.find((entry) => entry.id === currencyId);

    setEditDraft((current) => ({
      ...current,
      currency_id: currencyId,
      currency_code: currency?.currency_code || "",
    }));
  }

  function updateLine(
    localId: string,
    field: keyof CustomerPoLineDraft,
    value: string
  ) {
    setLineDrafts((current) =>
      current.map((row) =>
        row.localId === localId ? { ...row, [field]: value } : row
      )
    );
  }

  function applyItemToLine(localId: string, itemId: string) {
    const selectedItem = items.find((item) => item.id === itemId);

    setLineDrafts((current) =>
      current.map((row) => {
        if (row.localId !== localId) return row;

        if (!selectedItem) {
          return {
            ...row,
            item_id: "",
          };
        }

        return {
          ...row,
          item_id: selectedItem.id,
          description: selectedItem.description || selectedItem.name,
          unit_price: String(selectedItem.sales_price ?? 0),
          tax_code_id: selectedItem.tax_code_id || "",
          unit_of_measure_id: selectedItem.unit_of_measure_id || "",
          revenue_category_id: selectedItem.revenue_category_id || "",
        };
      })
    );
  }

  function addLine() {
    setLineDrafts((current) => [...current, createLineDraft()]);
  }

  function removeLine(localId: string) {
    setLineDrafts((current) => {
      if (current.length === 1) return current;
      return current.filter((row) => row.localId !== localId);
    });
  }

  async function handleUploadCustomerPoFile() {
    if (!customerPo?.id || !selectedFile) {
      setError("Select a Customer PO file first.");
      return;
    }

    try {
      setIsUploading(true);
      setError("");

      const userId = await getCurrentUserId();

      if (!userId) {
        throw new Error("User not authenticated.");
      }

      const safeFileName = selectedFile.name.replace(/\s+/g, "-");
      const storagePath = `customer-po/${customerPo.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("finance-customer-po-documents")
        .upload(storagePath, selectedFile, {
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: fileUploadRow, error: fileUploadError } = await supabase
        .from("file_uploads")
        .insert({
          user_id: userId,
          file_name: selectedFile.name,
          file_path: storagePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type || "application/octet-stream",
          entity_type: "finance_client_purchase_order",
        })
        .select("id")
        .single();

      if (fileUploadError) throw fileUploadError;

      const { error: attachmentError } = await supabase
        .from("finance_record_attachments")
        .insert({
          entity_type: "finance_client_purchase_order",
          entity_id: customerPo.id,
          file_upload_id: fileUploadRow.id,
          uploaded_by: userId,
          notes: "Customer PO document upload",
          metadata: {
            bucket: "finance-customer-po-documents",
          },
        });

      if (attachmentError) throw attachmentError;

      setSelectedFile(null);
      await loadCustomerPo();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to upload Customer PO document."
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleOpenCustomerPoFile(attachment: CustomerPoAttachment) {
    if (!attachment.file_path) {
      setError("Customer PO file path is missing.");
      return;
    }

    const { data, error: signedUrlError } = await supabase.storage
      .from("finance-customer-po-documents")
      .createSignedUrl(attachment.file_path, 60);

    if (signedUrlError) {
      console.error(signedUrlError);
      setError("Failed to open Customer PO document.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function updateCustomerPoStatus(status: CustomerPoStatus) {
    if (!customerPo) return;

    if (status === "verified" && !hasCustomerPoFile) {
      setError("Customer PO document must be uploaded before verification.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const userId = await getCurrentUserId();

      const timestampPatch: Partial<CustomerPoRow> = {};

      if (status === "verified") timestampPatch.verified_at = new Date().toISOString();
      if (status === "closed") timestampPatch.closed_at = new Date().toISOString();
      if (status === "canceled") timestampPatch.canceled_at = new Date().toISOString();
      if (status === "archived" || status === "deleted") {
        timestampPatch.archived_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("finance_client_purchase_orders")
        .update({
          status,
          ...timestampPatch,
          updated_by: userId,
        })
        .eq("id", customerPo.id);

      if (updateError) throw updateError;

      await loadCustomerPo();

      if (status === "archived" || status === "deleted") {
        navigate("/finance/transactions/customer-pos");
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to update Customer PO."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleOpenNewProformaInvoiceFromCustomerPo() {
    if (!customerPo) return;

    if (customerPo.status !== "received") {
      setError(
        "Customer PO must be marked as received before creating a proforma invoice."
      );
      return;
    }

    if (!hasCustomerPoFile) {
      setError(
        "Customer PO document must be uploaded before creating a proforma invoice."
      );
      return;
    }

    if (customerPo.proforma_invoice_id) {
      navigate(
        `/finance/transactions/proforma-invoices/${customerPo.proforma_invoice_id}`
      );
      return;
    }

    navigate(
      `/finance/transactions/proforma-invoices/new?client_po_id=${customerPo.id}`
    );
  }

  async function copyQuotationLinesToCustomerPo(
    quotationId: string,
    po: CustomerPoRow,
    userId: string | null
  ) {
    const { data: quotationLinesData, error: quotationLinesError } = await supabase
      .from("finance_quotation_line_items")
      .select(
        "id, quotation_id, item_id, item_name, description, quantity, unit_price, tax_rate, discount_rate, line_discount_amount, line_total, tax_code_id, unit_of_measure_id, revenue_category_id, sort_order"
      )
      .eq("quotation_id", quotationId)
      .order("sort_order", { ascending: true });

    if (quotationLinesError) throw quotationLinesError;

    const quotationLines = (quotationLinesData || []) as Array<
      QuotationLineOption & { sort_order: number | null }
    >;

    const { error: deleteExistingLinesError } = await supabase
      .from("finance_client_purchase_order_line_items")
      .update({
        status: "deleted",
        updated_by: userId,
      })
      .eq("client_po_id", po.id)
      .or("status.is.null,status.neq.deleted");

    if (deleteExistingLinesError) throw deleteExistingLinesError;

    if (quotationLines.length === 0) {
      const { error: clearTotalError } = await supabase
        .from("finance_client_purchase_orders")
        .update({
          total_amount: 0,
          updated_by: userId,
        })
        .eq("id", po.id);

      if (clearTotalError) throw clearTotalError;

      return;
    }

    let copiedTotal = 0;

    const copiedLines = quotationLines.map((line, index) => {
      const quantity = toNumber(line.quantity);
      const unitPrice = toNumber(line.unit_price);
      const discount = toNumber(line.line_discount_amount);
      const base = Math.max(quantity * unitPrice - discount, 0);
      const tax = base * (toNumber(line.tax_rate) / 100);
      const lineTotal = toNumber(line.line_total) || base + tax;

      copiedTotal += lineTotal;

      return {
        client_po_id: po.id,
        item_id: line.item_id || null,
        description: line.description || line.item_name || "Quotation line",
        quantity,
        unit_price: unitPrice,
        discount,
        line_total: lineTotal,
        sort_order: line.sort_order ?? index + 1,
        unit_of_measure_id: line.unit_of_measure_id || null,
        tax_code_id: line.tax_code_id || null,
        revenue_category_id: line.revenue_category_id || null,
        project_id: editDraft.project_id || po.project_id || null,
        task_id: editDraft.task_id || po.task_id || null,
        status: "active",
        reference_number:
          editDraft.external_po_number.trim() || po.external_po_number || null,
        notes: null,
        metadata: {
          source: "linked_quotation",
          quotation_id: quotationId,
          quotation_line_id: line.id,
        },
        created_by: userId,
        updated_by: userId,
      };
    });

    const { error: insertCopiedLinesError } = await supabase
      .from("finance_client_purchase_order_line_items")
      .insert(copiedLines);

    if (insertCopiedLinesError) throw insertCopiedLinesError;

    const { error: updateTotalError } = await supabase
      .from("finance_client_purchase_orders")
      .update({
        total_amount: copiedTotal,
        updated_by: userId,
      })
      .eq("id", po.id);

    if (updateTotalError) throw updateTotalError;
  }

  async function handleSaveDetailsEdit() {
    if (!customerPo || !canEditDetails) return;

    if (!editDraft.client_id) {
      setError("Client is required.");
      return;
    }

    if (!editDraft.external_po_number.trim()) {
      setError("Customer PO No. is required.");
      return;
    }

    if (!editDraft.company_id) {
      setError("Issuing company is required.");
      return;
    }

    if (!editDraft.currency_code) {
      setError("Currency is required.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const userId = await getCurrentUserId();

      const selectedDraftClient =
        clients.find((client) => client.id === editDraft.client_id) || null;
      const selectedDraftCompany =
        companies.find((company) => company.id === editDraft.company_id) || null;
      const selectedDraftCurrency =
        currencies.find((currency) => currency.id === editDraft.currency_id) || null;

      const { error: updateError } = await supabase
        .from("finance_client_purchase_orders")
        .update({
          external_po_number: editDraft.external_po_number.trim(),
          quotation_id: editDraft.quotation_id || null,
          client_id: editDraft.client_id || null,
          company_id: editDraft.company_id || null,
          currency_id: editDraft.currency_id || null,
          currency_code:
            editDraft.currency_code ||
            selectedDraftCurrency?.currency_code ||
            customerPo.currency_code ||
            null,
          po_date: editDraft.po_date || null,
          received_at: editDraft.received_date
            ? new Date(`${editDraft.received_date}T00:00:00`).toISOString()
            : null,
          notes: editDraft.notes.trim() || null,
          project_id: editDraft.project_id || null,
          task_id: editDraft.task_id || null,
          reference_number: editDraft.external_po_number.trim(),
          company_name_snapshot:
            selectedDraftCompany?.legal_name ||
            selectedDraftCompany?.name ||
            customerPo.company_name_snapshot ||
            null,
          company_legal_name_snapshot:
            selectedDraftCompany?.legal_name ||
            customerPo.company_legal_name_snapshot ||
            null,
          company_contact_person_snapshot:
            selectedDraftCompany?.contact_person ||
            customerPo.company_contact_person_snapshot ||
            null,
          company_email_snapshot:
            selectedDraftCompany?.email || customerPo.company_email_snapshot || null,
          company_phone_snapshot:
            selectedDraftCompany?.phone || customerPo.company_phone_snapshot || null,
          company_address_snapshot:
            makeAddressSnapshot(selectedDraftCompany) ||
            customerPo.company_address_snapshot ||
            null,
          client_name_snapshot:
            selectedDraftClient?.legal_name ||
            selectedDraftClient?.name ||
            customerPo.client_name_snapshot ||
            null,
          client_legal_name_snapshot:
            selectedDraftClient?.legal_name || customerPo.client_legal_name_snapshot || null,
          client_contact_person_snapshot:
            selectedDraftClient?.contact_person ||
            customerPo.client_contact_person_snapshot ||
            null,
          client_email_snapshot:
            selectedDraftClient?.company_email ||
            selectedDraftClient?.personnel_email ||
            customerPo.client_email_snapshot ||
            null,
          client_phone_snapshot:
            selectedDraftClient?.company_phone ||
            selectedDraftClient?.personnel_phone ||
            customerPo.client_phone_snapshot ||
            null,
          billing_address_snapshot:
            makeAddressSnapshot(selectedDraftClient) ||
            customerPo.billing_address_snapshot ||
            null,
          shipping_address_snapshot:
            makeAddressSnapshot(selectedDraftClient) ||
            customerPo.shipping_address_snapshot ||
            null,
          counterparty_type: "client",
          counterparty_company_id: null,
          is_intercompany: false,
          counterparty_name_snapshot:
            selectedDraftClient?.legal_name ||
            selectedDraftClient?.name ||
            customerPo.counterparty_name_snapshot ||
            null,
          counterparty_legal_name_snapshot:
            selectedDraftClient?.legal_name ||
            customerPo.counterparty_legal_name_snapshot ||
            null,
          counterparty_contact_person_snapshot:
            selectedDraftClient?.contact_person ||
            customerPo.counterparty_contact_person_snapshot ||
            null,
          counterparty_email_snapshot:
            selectedDraftClient?.company_email ||
            selectedDraftClient?.personnel_email ||
            customerPo.counterparty_email_snapshot ||
            null,
          counterparty_phone_snapshot:
            selectedDraftClient?.company_phone ||
            selectedDraftClient?.personnel_phone ||
            customerPo.counterparty_phone_snapshot ||
            null,
          updated_by: userId,
        })
        .eq("id", customerPo.id)
        .not("status", "in", "(archived,deleted,linked_to_pi)");

      if (updateError) throw updateError;

      if (
        editDraft.quotation_id &&
        (editDraft.quotation_id !== customerPo.quotation_id || lineItems.length === 0)
      ) {
        await copyQuotationLinesToCustomerPo(editDraft.quotation_id, customerPo, userId);
      }

      setIsEditingDetails(false);
      setIsEditingLines(false);
      await loadCustomerPo();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to update Customer PO details."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveLineItems() {
    if (!customerPo || !canEditDetails) return;

    const validLines = lineDrafts.map((line) => ({
      ...line,
      description: line.description.trim(),
    }));

    if (
      validLines.some(
        (line) =>
          !line.description ||
          toNumber(line.quantity) <= 0 ||
          toNumber(line.unit_price) < 0
      )
    ) {
      setError(
        "Every Customer PO line needs a description, quantity greater than 0, and unit price 0 or higher."
      );
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const userId = await getCurrentUserId();

      if (!userId) {
        throw new Error("User not authenticated.");
      }

      const existingIds = lineItems.map((line) => line.id);
      const draftExistingIds = validLines
        .map((line) => line.sourceId)
        .filter(Boolean) as string[];

      const idsToDelete = existingIds.filter(
        (existingId) => !draftExistingIds.includes(existingId)
      );

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("finance_client_purchase_order_line_items")
          .update({
            status: "deleted",
            updated_by: userId,
          })
          .in("id", idsToDelete);

        if (deleteError) throw deleteError;
      }

      for (let index = 0; index < validLines.length; index += 1) {
        const line = validLines[index];
        const taxCode = taxCodes.find((entry) => entry.id === line.tax_code_id);
        const base = Math.max(
          toNumber(line.quantity) * toNumber(line.unit_price) -
            toNumber(line.discount),
          0
        );
        const lineTaxAmount = base * (toNumber(taxCode?.rate_percent) / 100);
        const lineTotalAmount = base + lineTaxAmount;

        const payload = {
          client_po_id: customerPo.id,
          item_id: line.item_id || null,
          description: line.description,
          quantity: toNumber(line.quantity),
          unit_price: toNumber(line.unit_price),
          discount: toNumber(line.discount),
          line_total: lineTotalAmount,
          sort_order: index + 1,
          unit_of_measure_id: line.unit_of_measure_id || null,
          tax_code_id: line.tax_code_id || null,
          revenue_category_id: line.revenue_category_id || null,
          project_id: editDraft.project_id || customerPo.project_id || null,
          task_id: editDraft.task_id || customerPo.task_id || null,
          status: "active",
          reference_number:
            editDraft.external_po_number.trim() ||
            customerPo.external_po_number ||
            null,
          notes: line.notes.trim() || null,
          metadata: {
            source: editDraft.quotation_id ? "quotation_or_manual" : "manual",
            quotation_id: editDraft.quotation_id || customerPo.quotation_id || null,
          },
          updated_by: userId,
        };

        if (line.sourceId) {
          const { error: updateError } = await supabase
            .from("finance_client_purchase_order_line_items")
            .update(payload)
            .eq("id", line.sourceId)
            .eq("client_po_id", customerPo.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from("finance_client_purchase_order_line_items")
            .insert({
              ...payload,
              created_by: userId,
            });

          if (insertError) throw insertError;
        }
      }

      const { error: totalUpdateError } = await supabase
        .from("finance_client_purchase_orders")
        .update({
          total_amount: draftTotals.total,
          updated_by: userId,
        })
        .eq("id", customerPo.id)
        .not("status", "in", "(archived,deleted,linked_to_pi)");

      if (totalUpdateError) throw totalUpdateError;

      setIsEditingLines(false);
      await loadCustomerPo();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to update Customer PO lines."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRestore() {
    if (!customerPo) return;

    try {
      setIsSaving(true);
      setError("");

      const userId = await getCurrentUserId();

      const { error: restoreError } = await supabase
        .from("finance_client_purchase_orders")
        .update({
          status: "received",
          archived_at: null,
          updated_by: userId,
        })
        .eq("id", customerPo.id);

      if (restoreError) throw restoreError;

      await loadCustomerPo();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to restore Customer PO."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleHardDelete() {
    if (!customerPo) return;

    const confirmed = window.confirm(
      `Permanently delete ${customerPo.client_po_number || "this Customer PO"}?`
    );

    if (!confirmed) return;

    try {
      setIsSaving(true);
      setError("");

      const { error: deleteError } = await supabase
        .from("finance_client_purchase_orders")
        .delete()
        .eq("id", customerPo.id)
        .eq("status", "deleted");

      if (deleteError) throw deleteError;

      navigate("/finance/transactions/customer-pos");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to permanently delete Customer PO."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || isLoadingLookups) {
    return (
      <AixiaLoadingState
        title="Loading Customer PO"
        description="Customer PO record, lookup data, line items, linked documents, and attachments are being loaded."
      />
    );
  }

  if (!customerPo) {
    return (
      <AixiaEmptyState
        icon={FileText}
        title="Customer PO not found"
        description="The selected Customer PO record could not be found or is no longer available."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Customer POs"
        parentPath="/finance/transactions/customer-pos"
        badges={[
          { label: "Customer Commitment", tone: "emerald" },
          { label: "Customer PO Detail", tone: "cyan" },
          {
            label: hasCustomerPoFile ? "Document Uploaded" : "Document Required",
            tone: hasCustomerPoFile ? "emerald" : "rose",
          },
          { label: "Realtime + 60s", tone: "neutral" },
        ]}
        gradientTitle="CUSTOMER PURCHASE ORDER"
        title=""
        subtitle={
          customerPo.client_legal_name_snapshot ||
          customerPo.client_name_snapshot ||
          customerPo.counterparty_legal_name_snapshot ||
          customerPo.counterparty_name_snapshot ||
          "Customer"
        }
        description="Customer PO saved from a quotation or manual entry. The customer document must be uploaded before a proforma invoice can be created from this Customer PO."
        statusCards={[
          {
            label: "Linked Quotation",
            value: quotation?.quotation_number || selectedQuotation?.quotation_number || "—",
            description: "Source quotation linked to this Customer PO.",
            icon: Link2,
            tone: "cyan",
          },
          {
            label: "Linked PI",
            value: proforma?.proforma_number || "—",
            description: "Proforma invoice created from this Customer PO.",
            icon: FileText,
            tone: "violet",
          },
        ]}
      />

      {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Subtotal"
          value={formatMoney(lineSubtotal, displayedCurrencyCode)}
          description="Line value before discount and tax."
          icon={FileText}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Discount"
          value={formatMoney(lineDiscount, displayedCurrencyCode)}
          description="Customer PO discount value."
          icon={FileText}
          tone="gold"
        />
        <AixiaMetricCard
          label="Tax"
          value={formatMoney(lineTax, displayedCurrencyCode)}
          description="Derived from customer PO lines."
          icon={FileText}
          tone="violet"
        />
        <AixiaMetricCard
          label="Total"
          value={formatMoney(totalDisplayValue, displayedCurrencyCode)}
          description="Saved customer commitment value."
          icon={CheckCircle}
          tone="emerald"
        />
      </AixiaMetricGrid>

      <AixiaSection
        title="Lifecycle Actions"
        description="Customer PO workflow actions follow the locked quotation-to-PI flow."
        icon={CheckCircle}
      >
        <div className="aixia-action-row">
          {customerPo.status === "draft" ? (
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => void updateCustomerPoStatus("received")}
              disabled={isSaving}
            >
              <CheckCircle className="h-4 w-4" />
              Mark as Received
            </AixiaButton>
          ) : null}

          {customerPo.status === "received" && !customerPo.proforma_invoice_id ? (
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => handleOpenNewProformaInvoiceFromCustomerPo()}
              disabled={isSaving || !hasCustomerPoFile}
              title={
                hasCustomerPoFile
                  ? "Create Proforma Invoice"
                  : "Upload Customer PO document before creating a proforma invoice"
              }
            >
              <FileText className="h-4 w-4" />
              Create Proforma Invoice
            </AixiaButton>
          ) : null}

          {customerPo.proforma_invoice_id ? (
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() =>
                navigate(
                  `/finance/transactions/proforma-invoices/${customerPo.proforma_invoice_id}`
                )
              }
            >
              <FileText className="h-4 w-4" />
              Open Proforma Invoice
            </AixiaButton>
          ) : null}

          {customerPo.status === "archived" || customerPo.status === "deleted" ? (
            <AixiaButton
              type="button"
              variant="secondary"
              onClick={() => void handleRestore()}
              disabled={isSaving}
            >
              <RotateCcw className="h-4 w-4" />
              Restore
            </AixiaButton>
          ) : null}

          {customerPo.status !== "archived" && customerPo.status !== "deleted" ? (
            <AixiaButton
              type="button"
              variant="danger"
              onClick={() => void updateCustomerPoStatus("archived")}
              disabled={isSaving}
            >
              <Archive className="h-4 w-4" />
              Archive
            </AixiaButton>
          ) : null}

          {customerPo.status !== "deleted" ? (
            <AixiaButton
              type="button"
              variant="danger"
              onClick={() => void updateCustomerPoStatus("deleted")}
              disabled={isSaving}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </AixiaButton>
          ) : null}

          {customerPo.status === "deleted" ? (
            <AixiaButton
              type="button"
              variant="danger"
              onClick={() => void handleHardDelete()}
              disabled={isSaving}
            >
              <Trash2 className="h-4 w-4" />
              Delete Permanently
            </AixiaButton>
          ) : null}
        </div>
      </AixiaSection>

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        bottomSpan="never"
        sideRebalance="last-to-bottom"
        main={
          <>
            <AixiaDetailSection
              title="Document Overview"
              description="Customer PO identity, linked quotation, client, company, currency, dates, and notes."
              icon={FileText}
              actions={
                canEditDetails ? (
                  isEditingDetails ? (
                    <>
                      <AixiaButton
                        type="button"
                        variant="primary"
                        onClick={() => void handleSaveDetailsEdit()}
                        disabled={isSaving}
                      >
                        <Save className="h-4 w-4" />
                        {isSaving ? "Saving..." : "Save"}
                      </AixiaButton>
                      <AixiaButton
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setIsEditingDetails(false);
                          resetEditDraft();
                        }}
                      >
                        Cancel
                      </AixiaButton>
                    </>
                  ) : (
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={() => setIsEditingDetails(true)}
                    >
                      <SquarePen className="h-4 w-4" />
                      Edit
                    </AixiaButton>
                  )
                ) : null
              }
            >
              <AixiaFormGrid columns="three">
                <AixiaDisplayBlock
                  label="Internal CPO No."
                  value={customerPo.client_po_number || "Pending"}
                />

                <AixiaFormField>
                  <AixiaFieldLabel label="Customer PO No." required={isEditingDetails} />
                  {isEditingDetails ? (
                    <AixiaInputField
                      value={editDraft.external_po_number}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          external_po_number: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <AixiaDisplayBlock
                      label="Customer PO No."
                      value={customerPo.external_po_number || "—"}
                    />
                  )}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Linked Quotation" />
                  {isEditingDetails ? (
                    <AixiaSelectField
                      value={editDraft.quotation_id}
                      onChange={(event) =>
                        void handleQuotationChange(event.target.value)
                      }
                    >
                      <option value="">No linked quotation</option>
                      {filteredQuotations.map((quotationItem) => (
                        <option key={quotationItem.id} value={quotationItem.id}>
                          {quotationItem.quotation_number || "Quotation"} —{" "}
                          {formatMoney(
                            quotationItem.total_amount,
                            quotationItem.currency_code || displayedCurrencyCode
                          )}
                        </option>
                      ))}
                    </AixiaSelectField>
                  ) : (
                    <AixiaDisplayBlock
                      label="Linked Quotation"
                      value={quotation?.quotation_number || "—"}
                    />
                  )}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Client" required={isEditingDetails} />
                  {isEditingDetails ? (
                    <AixiaSelectField
                      value={editDraft.client_id}
                      onChange={(event) => handleClientChange(event.target.value)}
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
                      value={customerPo.client_name_snapshot || "—"}
                    />
                  )}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Issuing Company" required={isEditingDetails} />
                  {isEditingDetails ? (
                    <AixiaSelectField
                      value={editDraft.company_id}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          company_id: event.target.value,
                        }))
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
                      value={customerPo.company_name_snapshot || "—"}
                    />
                  )}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Currency" required={isEditingDetails} />
                  {isEditingDetails ? (
                    <AixiaSelectField
                      value={editDraft.currency_id}
                      onChange={(event) => handleCurrencyChange(event.target.value)}
                    >
                      <option value="">Select currency</option>
                      {currencies.map((currency) => (
                        <option key={currency.id} value={currency.id}>
                          {currency.currency_code} — {currency.currency_name || ""}
                        </option>
                      ))}
                    </AixiaSelectField>
                  ) : (
                    <AixiaDisplayBlock label="Currency" value={displayedCurrencyCode} />
                  )}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="PO Date" />
                  {isEditingDetails ? (
                    <AixiaInputField
                      type="date"
                      value={editDraft.po_date}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          po_date: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <AixiaDisplayBlock
                      label="PO Date"
                      value={formatDate(customerPo.po_date)}
                    />
                  )}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Received" />
                  {isEditingDetails ? (
                    <AixiaInputField
                      type="date"
                      value={editDraft.received_date}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          received_date: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <AixiaDisplayBlock
                      label="Received"
                      value={formatDate(customerPo.received_at)}
                    />
                  )}
                </AixiaFormField>

                <AixiaDisplayBlock
                  label="Status"
                  value={<AixiaStatusBadge value={customerPo.status} />}
                />

                <AixiaFormField>
                  <AixiaFieldLabel label="Project" />
                  {isEditingDetails ? (
                    <AixiaSelectField
                      value={editDraft.project_id}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          project_id: event.target.value,
                          task_id: "",
                        }))
                      }
                    >
                      <option value="">No project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </AixiaSelectField>
                  ) : (
                    <AixiaDisplayBlock
                      label="Project"
                      value={
                        projects.find((project) => project.id === customerPo.project_id)
                          ?.name || "—"
                      }
                    />
                  )}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Task" />
                  {isEditingDetails ? (
                    <AixiaSelectField
                      value={editDraft.task_id}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          task_id: event.target.value,
                        }))
                      }
                    >
                      <option value="">No task</option>
                      {filteredTasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </AixiaSelectField>
                  ) : (
                    <AixiaDisplayBlock
                      label="Task"
                      value={
                        tasks.find((task) => task.id === customerPo.task_id)?.title ||
                        "—"
                      }
                    />
                  )}
                </AixiaFormField>

                <AixiaDisplayBlock
                  label="Verified"
                  value={formatDate(customerPo.verified_at)}
                />

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Notes" />
                  {isEditingDetails ? (
                    <AixiaTextareaField
                      value={editDraft.notes}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      rows={4}
                    />
                  ) : (
                    <AixiaDisplayBlock
                      label="Notes"
                      value={customerPo.notes || "—"}
                    />
                  )}
                </AixiaFormFullWidth>
              </AixiaFormGrid>
            </AixiaDetailSection>

            <AixiaDetailSection
              title="Customer PO Line Items"
              description="Editable customer PO lines copied from quotation or entered manually."
              icon={SquarePen}
              actions={
                isEditingLines ? (
                  <>
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={() => void handleSaveLineItems()}
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "Saving..." : "Save"}
                    </AixiaButton>
                    <AixiaButton type="button" variant="secondary" onClick={addLine}>
                      <Plus className="h-4 w-4" />
                      Add Line
                    </AixiaButton>
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setIsEditingLines(false);
                        resetLineDrafts();
                      }}
                    >
                      Cancel
                    </AixiaButton>
                  </>
                ) : canEditDetails ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={() => setIsEditingLines(true)}
                  >
                    <SquarePen className="h-4 w-4" />
                    Edit
                  </AixiaButton>
                ) : null
              }
            >
              {isEditingLines ? (
                <div className="aixia-form-row-list">
                  {lineDrafts.map((line, index) => {
                    const selectedItem = items.find((item) => item.id === line.item_id);
                    const selectedTaxCode = taxCodes.find(
                      (entry) => entry.id === line.tax_code_id
                    );
                    const selectedUnit = unitsOfMeasure.find(
                      (unit) => unit.id === line.unit_of_measure_id
                    );
                    const selectedRevenueCategory = revenueCategories.find(
                      (category) => category.id === line.revenue_category_id
                    );

                    const base = Math.max(
                      toNumber(line.quantity) * toNumber(line.unit_price) -
                        toNumber(line.discount),
                      0
                    );
                    const currentLineTotal =
                      base + base * (toNumber(selectedTaxCode?.rate_percent) / 100);

                    return (
                      <AixiaFormRowCard
                        key={line.localId}
                        title={`Line ${index + 1}`}
                        description={selectedItem?.name || "Manual / no item"}
                        onRemove={() => removeLine(line.localId)}
                        removeDisabled={lineDrafts.length === 1}
                        removeLabel="Remove"
                      >
                        <AixiaFormGrid columns="three">
                          <AixiaFormField>
                            <AixiaFieldLabel label="Item" />
                            <AixiaSelectField
                              value={line.item_id}
                              onChange={(event) =>
                                applyItemToLine(line.localId, event.target.value)
                              }
                            >
                              <option value="">Manual / no item</option>
                              {items.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </AixiaSelectField>
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Description" />
                            <AixiaInputField
                              value={line.description}
                              onChange={(event) =>
                                updateLine(line.localId, "description", event.target.value)
                              }
                              placeholder="Description"
                            />
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Qty" />
                            <AixiaInputField
                              value={line.quantity}
                              onChange={(event) =>
                                updateLine(line.localId, "quantity", event.target.value)
                              }
                            />
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Unit" />
                            <AixiaSelectField
                              value={line.unit_of_measure_id}
                              onChange={(event) =>
                                updateLine(
                                  line.localId,
                                  "unit_of_measure_id",
                                  event.target.value
                                )
                              }
                            >
                              <option value="">No unit</option>
                              {unitsOfMeasure.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                  {unit.code} — {unit.name}
                                </option>
                              ))}
                            </AixiaSelectField>
                            {selectedUnit ? (
                              <div className="aixia-helper-text">{selectedUnit.code}</div>
                            ) : null}
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Unit Price" />
                            <AixiaInputField
                              value={line.unit_price}
                              onChange={(event) =>
                                updateLine(line.localId, "unit_price", event.target.value)
                              }
                            />
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Discount" />
                            <AixiaInputField
                              value={line.discount}
                              onChange={(event) =>
                                updateLine(line.localId, "discount", event.target.value)
                              }
                            />
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Tax Code" />
                            <AixiaSelectField
                              value={line.tax_code_id}
                              onChange={(event) =>
                                updateLine(line.localId, "tax_code_id", event.target.value)
                              }
                            >
                              <option value="">No tax</option>
                              {taxCodes.map((taxCode) => (
                                <option key={taxCode.id} value={taxCode.id}>
                                  {taxCode.name}
                                </option>
                              ))}
                            </AixiaSelectField>
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Revenue Category" />
                            <AixiaSelectField
                              value={line.revenue_category_id}
                              onChange={(event) =>
                                updateLine(
                                  line.localId,
                                  "revenue_category_id",
                                  event.target.value
                                )
                              }
                            >
                              <option value="">No category</option>
                              {revenueCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </AixiaSelectField>
                            {selectedRevenueCategory?.code ? (
                              <div className="aixia-helper-text">
                                {selectedRevenueCategory.code}
                              </div>
                            ) : null}
                          </AixiaFormField>

                          <AixiaDisplayBlock
                            label="Line Total"
                            value={formatMoney(currentLineTotal, displayedCurrencyCode)}
                          />

                          <AixiaFormFullWidth>
                            <AixiaFieldLabel label="Notes" />
                            <AixiaInputField
                              value={line.notes}
                              onChange={(event) =>
                                updateLine(line.localId, "notes", event.target.value)
                              }
                            />
                          </AixiaFormFullWidth>
                        </AixiaFormGrid>
                      </AixiaFormRowCard>
                    );
                  })}
                </div>
              ) : lineItems.length === 0 ? (
                <AixiaEmptyState
                  icon={SquarePen}
                  title="No Customer PO line items found"
                  description="Line items copied from a quotation or entered manually will appear here."
                />
              ) : (
                <div className="aixia-form-row-list">
                  {lineItems.map((line, index) => {
                    const unitLabel =
                      line.finance_units_of_measure?.code ||
                      line.finance_units_of_measure?.name ||
                      "—";

                    const taxLabel =
                      line.finance_tax_codes?.name ||
                      line.finance_tax_codes?.code ||
                      "—";

                    const revenueLabel =
                      line.finance_revenue_categories?.name ||
                      line.finance_revenue_categories?.code ||
                      "—";

                    return (
                      <AixiaFormRowCard
                        key={line.id}
                        title={`Line ${line.sort_order ?? index + 1}`}
                        description={line.item?.name || "Manual / no item"}
                      >
                        <AixiaFormGrid columns="three">
                          <AixiaDisplayBlock
                            label="Item"
                            value={line.item?.name || "—"}
                          />

                          <AixiaDisplayBlock
                            label="Description"
                            value={line.description || "—"}
                          />

                          <AixiaDisplayBlock
                            label="Qty"
                            value={String(toNumber(line.quantity))}
                          />

                          <AixiaDisplayBlock
                            label="Unit"
                            value={unitLabel}
                          />

                          <AixiaDisplayBlock
                            label="Unit Price"
                            value={formatMoney(line.unit_price, displayedCurrencyCode)}
                          />

                          <AixiaDisplayBlock
                            label="Discount"
                            value={formatMoney(line.discount, displayedCurrencyCode)}
                          />

                          <AixiaDisplayBlock
                            label="Tax Code"
                            value={taxLabel}
                          />

                          <AixiaDisplayBlock
                            label="Revenue Category"
                            value={revenueLabel}
                          />

                          <AixiaDisplayBlock
                            label="Line Total"
                            value={formatMoney(line.line_total, displayedCurrencyCode)}
                          />

                          {line.notes ? (
                            <AixiaFormFullWidth>
                              <AixiaDisplayBlock
                                label="Notes"
                                value={line.notes}
                              />
                            </AixiaFormFullWidth>
                          ) : null}
                        </AixiaFormGrid>
                      </AixiaFormRowCard>
                    );
                  })}
                </div>
              )}

              <AixiaMetricGrid>
                <AixiaMetricCard
                  label="Subtotal"
                  value={formatMoney(lineSubtotal, displayedCurrencyCode)}
                  description="Line subtotal."
                  icon={FileText}
                  tone="cyan"
                />
                <AixiaMetricCard
                  label="Discount"
                  value={formatMoney(lineDiscount, displayedCurrencyCode)}
                  description="Line discount."
                  icon={FileText}
                  tone="gold"
                />
                <AixiaMetricCard
                  label="Tax"
                  value={formatMoney(lineTax, displayedCurrencyCode)}
                  description="Calculated tax."
                  icon={FileText}
                  tone="violet"
                />
                <AixiaMetricCard
                  label="Total"
                  value={formatMoney(lineTotal, displayedCurrencyCode)}
                  description="Line total."
                  icon={CheckCircle}
                  tone="emerald"
                />
              </AixiaMetricGrid>
            </AixiaDetailSection>

            <AixiaSection
              title="Linked Documents"
              description="Source quotation and downstream proforma invoice."
              icon={Link2}
            >
              <AixiaFormGrid columns="two">
                <AixiaFormField>
                  <AixiaDisplayBlock
                    label="Linked Quotation"
                    value={quotation?.quotation_number || selectedQuotation?.quotation_number || "—"}
                    detail={
                      quotation || selectedQuotation
                        ? `${(quotation || selectedQuotation)?.status || "—"} · ${formatMoney(
                            (quotation || selectedQuotation)?.total_amount,
                            (quotation || selectedQuotation)?.currency_code ||
                              displayedCurrencyCode
                          )}`
                        : "No quotation linked."
                    }
                  />

                  {quotation || selectedQuotation ? (
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={() =>
                        navigate(
                          `/finance/transactions/quotations/${
                            (quotation || selectedQuotation)?.id
                          }`
                        )
                      }
                    >
                      <Eye className="h-4 w-4" />
                      Open
                    </AixiaButton>
                  ) : null}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaDisplayBlock
                    label="Linked Proforma Invoice"
                    value={proforma?.proforma_number || "—"}
                    detail={
                      proforma
                        ? `${proforma.status || "—"} · ${formatMoney(
                            proforma.total_amount,
                            proforma.currency_code || displayedCurrencyCode
                          )}`
                        : "No proforma invoice linked yet."
                    }
                  />

                  {proforma ? (
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={() =>
                        navigate(
                          `/finance/transactions/proforma-invoices/${proforma.id}`
                        )
                      }
                    >
                      <Eye className="h-4 w-4" />
                      Open
                    </AixiaButton>
                  ) : null}
                </AixiaFormField>
              </AixiaFormGrid>
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Customer PO Document"
              description="Upload or view the customer purchase order document."
              icon={Paperclip}
            >
              <AixiaDocumentUploadPanel
                selectedFile={selectedFile}
                attachments={attachments.map((attachment) => ({
                  id: attachment.id,
                  fileName: attachment.file_name || "Customer PO document",
                  badge: formatDate(attachment.created_at),
                  sizeLabel: attachment.file_size
                    ? `${(attachment.file_size / 1024 / 1024).toFixed(2)} MB`
                    : "Unknown size",
                  description: attachment.mime_type || "Unknown file type",
                  openLabel: "Open",
                }))}
                required
                disabled={!canEditDetails}
                uploading={isUploading}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                dropTitle="Drop Customer PO file here"
                dropDescription="Attach the original customer purchase order document. PDF, image, Word, or Excel files are supported."
                uploadLabel="Upload Document"
                uploadingLabel="Uploading..."
                selectedFileLabel="Selected Customer PO document"
                emptyTitle="No Customer PO document uploaded"
                emptyDescription="Upload the original Customer PO document before creating the PI."
                requiredMessage="No Customer PO document uploaded. PI creation is blocked."
                onFileSelect={(file) => {
                  setSelectedFile(file);
                  setError("");
                }}
                onRemoveSelectedFile={() => setSelectedFile(null)}
                onUpload={() => void handleUploadCustomerPoFile()}
                onOpenAttachment={async (documentAttachment) => {
                  const attachment = attachments.find(
                    (item) => item.id === documentAttachment.id
                  );

                  if (!attachment) {
                    setError("Customer PO attachment was not found.");
                    return;
                  }

                  await handleOpenCustomerPoFile(attachment);
                }}
              />
            </AixiaSection>

            <AixiaSection
              title="Workflow Rules"
              description="Locked Customer PO to proforma workflow."
              icon={CheckCircle}
            >
              <div className="aixia-stack">
                <AixiaAlert tone="info">
                  Customer PO can be linked to a quotation or entered manually.
                </AixiaAlert>
                <AixiaAlert tone="info">
                  Client, company, currency, quotation, and lines are editable before PI linking.
                </AixiaAlert>
                <AixiaAlert tone="info">
                  Customer PO document is required before creating the PI.
                </AixiaAlert>
                <AixiaAlert tone="info">
                  Draft records must be marked as received first.
                </AixiaAlert>
                <AixiaAlert tone="info">
                  Create Proforma Invoice is available after received status and file upload.
                </AixiaAlert>
                <AixiaAlert tone="info">
                  Archive keeps the record recoverable. Delete moves the record to deleted state.
                </AixiaAlert>
              </div>
            </AixiaSection>
          </>
        }
      />
    </AixiaPage>
  );
}
