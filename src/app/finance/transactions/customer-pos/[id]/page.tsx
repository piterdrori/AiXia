"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowRight,
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
  Upload,
  X,
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

function getStatusLabel(status: CustomerPoStatus) {
  switch (status) {
    case "draft":
      return "Draft";
    case "received":
      return "Received";
    case "verified":
      return "Verified";
    case "linked_to_pi":
      return "Linked to PI";
    case "closed":
      return "Closed";
    case "canceled":
      return "Canceled";
    case "archived":
      return "Archived";
    case "deleted":
      return "Deleted";
    default:
      return status;
  }
}

function getStatusBadgeClasses(status: CustomerPoStatus) {
  switch (status) {
    case "draft":
      return "border-slate-400/20 bg-white/[0.06] text-slate-300";
    case "received":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "verified":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "linked_to_pi":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "closed":
      return "border-slate-400/20 bg-slate-500/10 text-slate-200";
    case "canceled":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "archived":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "deleted":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    default:
      return "border-white/10 bg-white/10 text-white/75";
  }
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasureOption[]>(
    []
  );
  const [revenueCategories, setRevenueCategories] = useState<
    RevenueCategoryOption[]
  >([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
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

  const activeSectionClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";

  const summaryBlockClass =
    "rounded-[24px] border border-white/10 bg-black/20 p-4";

  const fieldShellClass =
    "mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-45";

  const inputFieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-45";

  const readOnlyFieldClass =
    "flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm leading-6 text-white/80";

  const labelClass = "text-[11px] uppercase tracking-[0.2em] text-slate-500";

  const inputLabelClass = "text-sm font-medium text-slate-300";

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

        supabase
          .from("projects")
          .select("id, name")
          .order("name", { ascending: true }),

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
      setRevenueCategories(
        (revenueCategoriesResult.data || []) as RevenueCategoryOption[]
      );
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
        .select(`
          id,
          entity_id,
          created_at,
          file_uploads (
            file_name,
            file_path,
            file_size,
            mime_type
          )
        `)
        .eq("entity_type", "finance_client_purchase_order")
        .eq("entity_id", id)
        .order("created_at", { ascending: false });

      if (attachmentError) throw attachmentError;

      const mappedAttachments = ((attachmentData || []) as any[]).map(
        (row) => ({
          id: row.id,
          entity_id: String(row.entity_id || ""),
          created_at: row.created_at || null,
          file_name: row.file_uploads?.file_name || null,
          file_path: row.file_uploads?.file_path || null,
          file_size: row.file_uploads?.file_size || null,
          mime_type: row.file_uploads?.mime_type || null,
        })
      );

      setAttachments(mappedAttachments);

      const { data: lineItemData, error: lineItemError } = await supabase
        .from("finance_client_purchase_order_line_items")
        .select(`
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
        `)
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
      supabase.removeChannel(channel);
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
    customerPo?.status !== "archived" &&
    customerPo?.status !== "deleted";

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

  function handleDropFile(fileList: FileList | null) {
    const file = fileList?.[0] || null;
    if (!file) return;
    setSelectedFile(file);
    setError("");
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
            selectedDraftCompany?.legal_name || customerPo.company_legal_name_snapshot || null,
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
        const lineTax = base * (toNumber(taxCode?.rate_percent) / 100);
        const lineTotal = base + lineTax;

        const payload = {
          client_po_id: customerPo.id,
          item_id: line.item_id || null,
          description: line.description,
          quantity: toNumber(line.quantity),
          unit_price: toNumber(line.unit_price),
          discount: toNumber(line.discount),
          line_total: lineTotal,
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
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-slate-400">
            Loading Customer PO...
          </div>
        </div>
      </div>
    );
  }

  if (!customerPo) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-slate-400">
            Customer PO not found.
          </div>
        </div>
      </div>
    );
  }

  const totalDisplayValue = isEditingLines ? draftTotals.total : customerPo.total_amount || lineTotal;

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/customer-pos")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Customer POs
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_620px]">
              <div>
                <Badge className="inline-flex w-fit rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                  Customer Commitment
                </Badge>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                    {customerPo.client_po_number || "Customer PO"}
                  </h1>

                  <Badge
                    className={`rounded-full border px-3 py-1 text-xs shadow-none ${getStatusBadgeClasses(
                      customerPo.status
                    )}`}
                  >
                    {getStatusLabel(customerPo.status)}
                  </Badge>

                  <Badge
                    className={`rounded-full border px-3 py-1 text-xs shadow-none ${
                      hasCustomerPoFile
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        : "border-rose-400/20 bg-rose-500/10 text-rose-200"
                    }`}
                  >
                    {hasCustomerPoFile ? "Document uploaded" : "Document required"}
                  </Badge>
                </div>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Customer PO saved in the system from a quotation or manual entry.
                  The customer document must be uploaded before the proforma invoice
                  can be created from this Customer PO.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-none">
                    Customer PO No. {customerPo.external_po_number || "—"}
                  </Badge>
                  <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200 shadow-none">
                    {formatMoney(totalDisplayValue, displayedCurrencyCode)}
                  </Badge>
                  <Badge className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 shadow-none">
                    Auto-refresh enabled
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Linked Quotation
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {quotation?.quotation_number || selectedQuotation?.quotation_number || "—"}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <Link2 className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Source quotation linked to this Customer PO.
                  </p>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Linked PI
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {proforma?.proforma_number || "—"}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Proforma invoice created from this Customer PO.
                  </p>
                </div>
              </div>
            </div>


                        <div className="mt-6 flex flex-wrap gap-3">
              {customerPo.status === "draft" ? (
                <Button
                  onClick={() => void updateCustomerPoStatus("received")}
                  disabled={isSaving}
                  className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Received
                </Button>
              ) : null}

              {customerPo.status === "received" && !customerPo.proforma_invoice_id ? (
                <Button
                  onClick={() => handleOpenNewProformaInvoiceFromCustomerPo()}
                  disabled={isSaving || !hasCustomerPoFile}
                  title={
                    hasCustomerPoFile
                      ? "Create Proforma Invoice"
                      : "Upload Customer PO document before creating a proforma invoice"
                  }
                  className={`h-11 rounded-2xl border px-4 font-semibold ${
                    hasCustomerPoFile
                      ? "border-cyan-400/20 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                      : "cursor-not-allowed border-white/10 bg-white/[0.05] text-slate-500 opacity-50"
                  }`}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Create Proforma Invoice
                </Button>
              ) : null}

              {customerPo.proforma_invoice_id ? (
                <Button
                  onClick={() =>
                    navigate(
                      `/finance/transactions/proforma-invoices/${customerPo.proforma_invoice_id}`
                    )
                  }
                  className="h-11 rounded-2xl border border-violet-400/20 bg-violet-500 px-4 font-semibold text-white hover:bg-violet-400"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Open Proforma Invoice
                </Button>
              ) : null}

              {customerPo.status === "archived" || customerPo.status === "deleted" ? (
                <Button
                  variant="outline"
                  onClick={() => void handleRestore()}
                  disabled={isSaving}
                  className="h-11 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-200 hover:bg-emerald-500/20"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </Button>
              ) : null}

              {customerPo.status !== "archived" && customerPo.status !== "deleted" ? (
                <Button
                  variant="outline"
                  onClick={() => void updateCustomerPoStatus("archived")}
                  disabled={isSaving}
                  className="h-11 rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
              ) : null}

              {customerPo.status !== "deleted" ? (
                <Button
                  variant="outline"
                  onClick={() => void updateCustomerPoStatus("deleted")}
                  disabled={isSaving}
                  className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              ) : null}

              {customerPo.status === "deleted" ? (
                <Button
                  variant="outline"
                  onClick={() => void handleHardDelete()}
                  disabled={isSaving}
                  className="h-11 rounded-2xl border-rose-500/30 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hard Delete
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Subtotal
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-cyan-100">
                  {formatMoney(lineSubtotal, displayedCurrencyCode)}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Line value before discount and tax.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Discount
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-amber-100">
                  {formatMoney(lineDiscount, displayedCurrencyCode)}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Customer PO discount value.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/20 via-violet-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Tax
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-violet-100">
                  {formatMoney(lineTax, displayedCurrencyCode)}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Derived from customer PO lines.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Total
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-emerald-100">
                  {formatMoney(totalDisplayValue, displayedCurrencyCode)}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Saved customer commitment value.
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
                      Customer PO identity, linked quotation, client, company, currency, dates, and notes.
                    </CardDescription>
                  </div>
                </div>

                {canEditDetails ? (
                  <div className="flex items-center gap-2">
                    {isEditingDetails ? (
                      <>
                        <Button
                          onClick={() => void handleSaveDetailsEdit()}
                          disabled={isSaving}
                          className="h-9 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-3 font-semibold text-slate-950 hover:bg-cyan-400"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSaving ? "Saving..." : "Save"}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditingDetails(false);
                            resetEditDraft();
                          }}
                          className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingDetails(true)}
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
                <div className={summaryBlockClass}>
                  <div className={labelClass}>Internal CPO No.</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {customerPo.client_po_number || "Pending"}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Customer PO No.</div>
                  {isEditingDetails ? (
                    <input
                      value={editDraft.external_po_number}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          external_po_number: event.target.value,
                        }))
                      }
                      className={fieldShellClass}
                    />
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {customerPo.external_po_number || "—"}
                    </div>
                  )}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Linked Quotation</div>
                  {isEditingDetails ? (
                    <select
                      value={editDraft.quotation_id}
                      onChange={(event) =>
                        void handleQuotationChange(event.target.value)
                      }
                      className={fieldShellClass}
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
                    </select>
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {quotation?.quotation_number || "—"}
                    </div>
                  )}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Client</div>
                  {isEditingDetails ? (
                    <select
                      value={editDraft.client_id}
                      onChange={(event) => handleClientChange(event.target.value)}
                      className={fieldShellClass}
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
                      {customerPo.client_name_snapshot || "—"}
                    </div>
                  )}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Issuing Company</div>
                  {isEditingDetails ? (
                    <select
                      value={editDraft.company_id}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          company_id: event.target.value,
                        }))
                      }
                      className={fieldShellClass}
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
                      {customerPo.company_name_snapshot || "—"}
                    </div>
                  )}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Currency</div>
                  {isEditingDetails ? (
                    <select
                      value={editDraft.currency_id}
                      onChange={(event) => handleCurrencyChange(event.target.value)}
                      className={fieldShellClass}
                    >
                      <option value="">Select currency</option>
                      {currencies.map((currency) => (
                        <option key={currency.id} value={currency.id}>
                          {currency.currency_code} — {currency.currency_name || ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {displayedCurrencyCode}
                    </div>
                  )}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>PO Date</div>
                  {isEditingDetails ? (
                    <input
                      type="date"
                      value={editDraft.po_date}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          po_date: event.target.value,
                        }))
                      }
                      className={fieldShellClass}
                    />
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatDate(customerPo.po_date)}
                    </div>
                  )}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Received</div>
                  {isEditingDetails ? (
                    <input
                      type="date"
                      value={editDraft.received_date}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          received_date: event.target.value,
                        }))
                      }
                      className={fieldShellClass}
                    />
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatDate(customerPo.received_at)}
                    </div>
                  )}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Status</div>
                  <div className="mt-2">
                    <Badge
                      className={`rounded-full border px-3 py-1 text-xs shadow-none ${getStatusBadgeClasses(
                        customerPo.status
                      )}`}
                    >
                      {getStatusLabel(customerPo.status)}
                    </Badge>
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Project</div>
                  {isEditingDetails ? (
                    <select
                      value={editDraft.project_id}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          project_id: event.target.value,
                          task_id: "",
                        }))
                      }
                      className={fieldShellClass}
                    >
                      <option value="">No project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {projects.find((project) => project.id === customerPo.project_id)
                        ?.name || "—"}
                    </div>
                  )}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Task</div>
                  {isEditingDetails ? (
                    <select
                      value={editDraft.task_id}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          task_id: event.target.value,
                        }))
                      }
                      className={fieldShellClass}
                    >
                      <option value="">No task</option>
                      {filteredTasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {tasks.find((task) => task.id === customerPo.task_id)?.title ||
                        "—"}
                    </div>
                  )}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Verified</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatDate(customerPo.verified_at)}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-3">
                  <div className={labelClass}>Notes</div>
                  {isEditingDetails ? (
                    <textarea
                      value={editDraft.notes}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      rows={4}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                    />
                  ) : (
                    <div className="mt-2 text-sm leading-6 text-slate-300">
                      {customerPo.notes || "—"}
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
                      Customer PO Line Items
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Editable customer PO lines copied from quotation or entered manually.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isEditingLines ? (
                    <>
                      <Button
                        onClick={() => void handleSaveLineItems()}
                        disabled={isSaving}
                        className="h-9 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-3 font-semibold text-slate-950 hover:bg-cyan-400"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? "Saving..." : "Save"}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={addLine}
                        className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Line
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingLines(false);
                          resetLineDrafts();
                        }}
                        className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : canEditDetails ? (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingLines(true)}
                      className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                    >
                      <SquarePen className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="p-5">
                {isEditingLines ? (
                  <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
                    {lineDrafts.map((line, index) => {
                      const selectedItem = items.find(
                        (item) => item.id === line.item_id
                      );
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
                        base +
                        base * (toNumber(selectedTaxCode?.rate_percent) / 100);

                      return (
                        <div
                          key={line.localId}
                          className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                        >
                          <div className="mb-4 flex items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-white">
                                Line {index + 1}
                              </div>

                              {selectedItem ? (
                                <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200 shadow-none">
                                  {selectedItem.name}
                                </Badge>
                              ) : null}
                            </div>

                            <Button
                              variant="outline"
                              onClick={() => removeLine(line.localId)}
                              disabled={lineDrafts.length === 1}
                              className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                            <label className="space-y-2 md:col-span-3">
                              <div className={inputLabelClass}>Item</div>
                              <select
                                value={line.item_id}
                                onChange={(event) =>
                                  applyItemToLine(line.localId, event.target.value)
                                }
                                className={inputFieldClass}
                              >
                                <option value="">Manual / no item</option>
                                {items.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="space-y-2 md:col-span-4">
                              <div className={inputLabelClass}>Description</div>
                              <input
                                value={line.description}
                                onChange={(event) =>
                                  updateLine(
                                    line.localId,
                                    "description",
                                    event.target.value
                                  )
                                }
                                placeholder="Description"
                                className={inputFieldClass}
                              />
                            </label>

                            <label className="space-y-2 md:col-span-1">
                              <div className={inputLabelClass}>Qty</div>
                              <input
                                value={line.quantity}
                                onChange={(event) =>
                                  updateLine(
                                    line.localId,
                                    "quantity",
                                    event.target.value
                                  )
                                }
                                className={inputFieldClass}
                              />
                            </label>

                            <label className="space-y-2 md:col-span-2">
                              <div className={inputLabelClass}>Unit</div>
                              <select
                                value={line.unit_of_measure_id}
                                onChange={(event) =>
                                  updateLine(
                                    line.localId,
                                    "unit_of_measure_id",
                                    event.target.value
                                  )
                                }
                                className={inputFieldClass}
                              >
                                <option value="">No unit</option>
                                {unitsOfMeasure.map((unit) => (
                                  <option key={unit.id} value={unit.id}>
                                    {unit.code} — {unit.name}
                                  </option>
                                ))}
                              </select>
                              {selectedUnit ? (
                                <div className="text-[11px] text-slate-500">
                                  {selectedUnit.code}
                                </div>
                              ) : null}
                            </label>

                            <label className="space-y-2 md:col-span-2">
                              <div className={inputLabelClass}>Unit Price</div>
                              <input
                                value={line.unit_price}
                                onChange={(event) =>
                                  updateLine(
                                    line.localId,
                                    "unit_price",
                                    event.target.value
                                  )
                                }
                                className={inputFieldClass}
                              />
                            </label>

                            <label className="space-y-2 md:col-span-2">
                              <div className={inputLabelClass}>Discount</div>
                              <input
                                value={line.discount}
                                onChange={(event) =>
                                  updateLine(
                                    line.localId,
                                    "discount",
                                    event.target.value
                                  )
                                }
                                className={inputFieldClass}
                              />
                            </label>

                            <label className="space-y-2 md:col-span-2">
                              <div className={inputLabelClass}>Tax Code</div>
                              <select
                                value={line.tax_code_id}
                                onChange={(event) =>
                                  updateLine(
                                    line.localId,
                                    "tax_code_id",
                                    event.target.value
                                  )
                                }
                                className={inputFieldClass}
                              >
                                <option value="">No tax</option>
                                {taxCodes.map((taxCode) => (
                                  <option key={taxCode.id} value={taxCode.id}>
                                    {taxCode.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="space-y-2 md:col-span-3">
                              <div className={inputLabelClass}>
                                Revenue Category
                              </div>
                              <select
                                value={line.revenue_category_id}
                                onChange={(event) =>
                                  updateLine(
                                    line.localId,
                                    "revenue_category_id",
                                    event.target.value
                                  )
                                }
                                className={inputFieldClass}
                              >
                                <option value="">No category</option>
                                {revenueCategories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                              {selectedRevenueCategory?.code ? (
                                <div className="text-[11px] text-slate-500">
                                  {selectedRevenueCategory.code}
                                </div>
                              ) : null}
                            </label>

                            <div className="space-y-2 md:col-span-3">
                              <div className={inputLabelClass}>Line Total</div>
                              <div className="flex min-h-[44px] items-center rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100">
                                {formatMoney(
                                  currentLineTotal,
                                  displayedCurrencyCode
                                )}
                              </div>
                            </div>

                            <label className="space-y-2 md:col-span-12">
                              <div className={inputLabelClass}>Notes</div>
                              <input
                                value={line.notes}
                                onChange={(event) =>
                                  updateLine(
                                    line.localId,
                                    "notes",
                                    event.target.value
                                  )
                                }
                                className={inputFieldClass}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
      
                ) : lineItems.length === 0 ? (
                  <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-6 text-sm text-slate-500">
                    No Customer PO line items found.
                  </div>
                ) : (
                  <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
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
                        <div
                          key={line.id}
                          className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                        >
                          <div className="mb-4 flex items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-white">
                                Line {line.sort_order ?? index + 1}
                              </div>

                              {line.item?.name ? (
                                <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200 shadow-none">
                                  {line.item.name}
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                            <div className="space-y-2 md:col-span-3">
                              <div className={inputLabelClass}>Item</div>
                              <div className={readOnlyFieldClass}>
                                {line.item?.name || "—"}
                              </div>
                            </div>

                            <div className="space-y-2 md:col-span-4">
                              <div className={inputLabelClass}>Description</div>
                              <div className={readOnlyFieldClass}>
                                {line.description || "—"}
                              </div>
                            </div>

                            <div className="space-y-2 md:col-span-1">
                              <div className={inputLabelClass}>Qty</div>
                              <div className={readOnlyFieldClass}>
                                {toNumber(line.quantity)}
                              </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                              <div className={inputLabelClass}>Unit</div>
                              <div className={readOnlyFieldClass}>{unitLabel}</div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                              <div className={inputLabelClass}>Unit Price</div>
                              <div className={readOnlyFieldClass}>
                                {formatMoney(line.unit_price, displayedCurrencyCode)}
                              </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                              <div className={inputLabelClass}>Discount</div>
                              <div className={readOnlyFieldClass}>
                                {formatMoney(line.discount, displayedCurrencyCode)}
                              </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                              <div className={inputLabelClass}>Tax Code</div>
                              <div className={readOnlyFieldClass}>{taxLabel}</div>
                            </div>

                            <div className="space-y-2 md:col-span-3">
                              <div className={inputLabelClass}>
                                Revenue Category
                              </div>
                              <div className={readOnlyFieldClass}>
                                {revenueLabel}
                              </div>
                            </div>

                            <div className="space-y-2 md:col-span-3">
                              <div className={inputLabelClass}>Line Total</div>
                              <div className="flex min-h-[44px] items-center rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100">
                                {formatMoney(
                                  line.line_total,
                                  displayedCurrencyCode
                                )}
                              </div>
                            </div>

                            {line.notes ? (
                              <div className="space-y-2 md:col-span-12">
                                <div className={inputLabelClass}>Notes</div>
                                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-300">
                                  {line.notes}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Subtotal</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatMoney(lineSubtotal, displayedCurrencyCode)}
                    </div>
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Discount</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatMoney(lineDiscount, displayedCurrencyCode)}
                    </div>
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Tax</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatMoney(lineTax, displayedCurrencyCode)}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-4">
                    <div className={labelClass}>Total</div>
                    <div className="mt-2 text-2xl font-semibold text-cyan-100">
                      {formatMoney(lineTotal, displayedCurrencyCode)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={activeSectionClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Linked Documents
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Source quotation and downstream proforma invoice.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <div className={summaryBlockClass}>
                  <div className={labelClass}>Linked Quotation</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {quotation?.quotation_number || selectedQuotation?.quotation_number || "—"}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {quotation || selectedQuotation
                      ? `${(quotation || selectedQuotation)?.status || "—"} · ${formatMoney(
                          (quotation || selectedQuotation)?.total_amount,
                          (quotation || selectedQuotation)?.currency_code ||
                            displayedCurrencyCode
                        )}`
                      : "No quotation linked."}
                  </div>
                  {quotation || selectedQuotation ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/finance/transactions/quotations/${
                            (quotation || selectedQuotation)?.id
                          }`
                        )
                      }
                      className="mt-4 h-9 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-3 text-cyan-200 hover:bg-cyan-500/20"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Open
                    </Button>
                  ) : null}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Linked Proforma Invoice</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {proforma?.proforma_number || "—"}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {proforma
                      ? `${proforma.status || "—"} · ${formatMoney(
                          proforma.total_amount,
                          proforma.currency_code || displayedCurrencyCode
                        )}`
                      : "No proforma invoice linked yet."}
                  </div>
                  {proforma ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/finance/transactions/proforma-invoices/${proforma.id}`
                        )
                      }
                      className="mt-4 h-9 rounded-2xl border-violet-400/20 bg-violet-500/10 px-3 text-violet-200 hover:bg-violet-500/20"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Open
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className={activeSectionClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Customer PO Document
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Upload or view the customer purchase order document.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-5">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => handleDropFile(event.target.files)}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDraggingFile(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDraggingFile(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDraggingFile(false);
                    handleDropFile(event.dataTransfer.files);
                  }}
                  className={`flex min-h-[190px] w-full flex-col items-center justify-center rounded-[26px] border border-dashed px-6 py-8 text-center transition ${
                    isDraggingFile
                      ? "border-cyan-300 bg-cyan-500/10"
                      : "border-white/15 bg-black/20 hover:border-cyan-400/30 hover:bg-cyan-500/5"
                  }`}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                    <Upload className="h-6 w-6" />
                  </div>

                  <div className="mt-4 text-sm font-semibold text-white">
                    Drop Customer PO file here
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    PDF, image, Word, or Excel. Click to browse.
                  </div>
                </button>

                {selectedFile ? (
                  <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-emerald-100">
                          {selectedFile.name}
                        </div>
                        <div className="mt-1 text-xs text-emerald-200/70">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setSelectedFile(null)}
                        className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}

                <Button
                  onClick={() => void handleUploadCustomerPoFile()}
                  disabled={!selectedFile || isUploading}
                  className="h-11 w-full rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-40"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isUploading ? "Uploading..." : "Upload Document"}
                </Button>

                <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                  {attachments.length === 0 ? (
                    <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">
                      No Customer PO document uploaded. PI creation is blocked.
                    </div>
                  ) : (
                    attachments.map((attachment) => (
                      <button
                        key={attachment.id}
                        type="button"
                        onClick={() => void handleOpenCustomerPoFile(attachment)}
                        className="flex w-full items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:bg-white/[0.045]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Paperclip className="h-4 w-4 text-cyan-200" />
                            <span className="truncate">
                              {attachment.file_name || "Customer PO document"}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-white/45">
                            {formatDate(attachment.created_at)}
                          </div>
                        </div>

                        <ArrowRight className="h-4 w-4 shrink-0 text-white/35" />
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={activeSectionClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-emerald-200">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Workflow Rules
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Locked Customer PO to proforma workflow.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-5 text-sm leading-6 text-slate-400">
                <div>• Customer PO can be linked to a quotation or entered manually.</div>
                <div>• Client, company, currency, quotation, and lines are editable before PI linking.</div>
                <div>• Customer PO document is required before creating the PI.</div>
                <div>• Draft records must be marked as received first.</div>
                <div>• Create Proforma Invoice is available after received status and file upload.</div>
                <div>• After PI exists, use Open Proforma Invoice.</div>
                <div>• Archive keeps the record recoverable.</div>
                <div>• Delete moves the record to deleted state.</div>
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
  );
}
