"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  Plus,
  Save,
  SquarePen,
  Trash2,
  Upload,
  Wallet,
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

type CustomerPoStatus = "draft" | "received";

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

type CustomerPoFormState = {
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
  status: CustomerPoStatus;
};

type CustomerPoLineDraft = {
  localId: string;
  item_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount: string;
  tax_code_id: string;
  unit_of_measure_id: string;
  revenue_category_id: string;
};

const EMPTY_FORM: CustomerPoFormState = {
  client_id: "",
  quotation_id: "",
  external_po_number: "",
  company_id: "",
  po_date: new Date().toISOString().slice(0, 10),
  received_date: new Date().toISOString().slice(0, 10),
  currency_id: "",
  currency_code: "",
  project_id: "",
  task_id: "",
  notes: "",
  status: "received",
};

function createLineDraft(): CustomerPoLineDraft {
  return {
    localId: crypto.randomUUID(),
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

export default function FinanceNewCustomerPoPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const [form, setForm] = useState<CustomerPoFormState>(EMPTY_FORM);
  const [lineDrafts, setLineDrafts] = useState<CustomerPoLineDraft[]>([
    createLineDraft(),
  ]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isLoadingLookups, setIsLoadingLookups] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const activeSectionClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";

  const summaryBlockClass =
    "rounded-[24px] border border-white/10 bg-black/20 p-4";

  const fieldShellClass =
    "mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-45";

  const inputFieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-45";

  const labelClass = "text-[11px] uppercase tracking-[0.2em] text-slate-500";

  const inputLabelClass = "text-sm font-medium text-slate-300";

  const loadLookups = useCallback(async () => {
    setIsLoadingLookups(true);
    setError("");

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

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  const filteredQuotations = useMemo(() => {
    if (!form.client_id) return [];
    return quotations.filter((quotation) => quotation.client_id === form.client_id);
  }, [form.client_id, quotations]);

  const filteredTasks = useMemo(() => {
    if (!form.project_id) return tasks;
    return tasks.filter((task) => task.project_id === form.project_id);
  }, [form.project_id, tasks]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === form.client_id) || null,
    [clients, form.client_id]
  );

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === form.company_id) || null,
    [companies, form.company_id]
  );

  const selectedQuotation = useMemo(
    () => quotations.find((quotation) => quotation.id === form.quotation_id) || null,
    [form.quotation_id, quotations]
  );

  const selectedCurrency = useMemo(
    () => currencies.find((currency) => currency.id === form.currency_id) || null,
    [currencies, form.currency_id]
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === form.project_id) || null,
    [form.project_id, projects]
  );

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === form.task_id) || null,
    [form.task_id, tasks]
  );

  const totals = useMemo(() => {
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

  function handleClientChange(clientId: string) {
    setForm((current) => ({
      ...current,
      client_id: clientId,
      quotation_id: "",
      company_id: "",
      currency_id: "",
      currency_code: "",
      project_id: "",
      task_id: "",
    }));
  }

  async function handleQuotationChange(quotationId: string) {
    const quotation = quotations.find((entry) => entry.id === quotationId);

    if (!quotation) {
      setForm((current) => ({
        ...current,
        quotation_id: "",
      }));

      return;
    }

    const matchedCurrency = currencies.find(
      (currency) =>
        currency.id === quotation.currency_id ||
        currency.currency_code === quotation.currency_code
    );

    setForm((current) => ({
      ...current,
      quotation_id: quotation.id,
      company_id: quotation.company_id || current.company_id,
      currency_id: matchedCurrency?.id || current.currency_id,
      currency_code:
        matchedCurrency?.currency_code ||
        quotation.currency_code ||
        current.currency_code,
      project_id: quotation.project_id || current.project_id,
      task_id: quotation.task_id || current.task_id,
    }));

    const { data, error: linesError } = await supabase
      .from("finance_quotation_line_items")
      .select(
        "id, quotation_id, item_id, item_name, description, quantity, unit_price, tax_rate, discount_rate, line_discount_amount, line_total, tax_code_id, unit_of_measure_id, revenue_category_id"
      )
      .eq("quotation_id", quotation.id)
      .order("sort_order", { ascending: true });

    if (linesError) {
      console.error(linesError);
      setError("Failed to load quotation line items.");
      return;
    }

    const lines = (data || []) as QuotationLineOption[];

    if (lines.length > 0) {
      setLineDrafts(
        lines.map((line) => ({
          localId: crypto.randomUUID(),
          item_id: line.item_id || "",
          description: line.description || line.item_name || "",
          quantity: String(line.quantity ?? 1),
          unit_price: String(line.unit_price ?? 0),
          discount: String(line.line_discount_amount ?? 0),
          tax_code_id: line.tax_code_id || "",
          unit_of_measure_id: line.unit_of_measure_id || "",
          revenue_category_id: line.revenue_category_id || "",
        }))
      );
    }
  }

  function handleCurrencyChange(currencyId: string) {
    const currency = currencies.find((entry) => entry.id === currencyId);

    setForm((current) => ({
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

  async function uploadCustomerPoFile(poId: string, file: File, userId: string) {
    const safeFileName = file.name.replace(/\s+/g, "-");
    const storagePath = `customer-po/${poId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("finance-customer-po-documents")
      .upload(storagePath, file, {
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: fileUploadRow, error: fileUploadError } = await supabase
      .from("file_uploads")
      .insert({
        user_id: userId,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
        entity_type: "finance_client_purchase_order",
      })
      .select("id")
      .single();

    if (fileUploadError) throw fileUploadError;

    const { error: attachmentError } = await supabase
      .from("finance_record_attachments")
      .insert({
        entity_type: "finance_client_purchase_order",
        entity_id: poId,
        file_upload_id: fileUploadRow.id,
        uploaded_by: userId,
        notes: "Customer PO document upload",
        metadata: {
          bucket: "finance-customer-po-documents",
        },
      });

    if (attachmentError) throw attachmentError;
  }

  async function handleCreateCustomerPo() {
    if (!form.client_id) {
      setError("Client is required.");
      return;
    }

    if (!form.external_po_number.trim()) {
      setError("Customer PO No. is required.");
      return;
    }

    if (!form.company_id) {
      setError("Company is required.");
      return;
    }

    if (!form.currency_code) {
      setError("Currency is required.");
      return;
    }

    if (!selectedFile) {
      setError("Customer PO document is required.");
      return;
    }

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

      const payload = {
        external_po_number: form.external_po_number.trim(),
        quotation_id: form.quotation_id || null,
        proforma_invoice_id: null,
        client_id: form.client_id || null,
        company_id: form.company_id || null,
        po_date: form.po_date || null,
        received_at: form.received_date
          ? new Date(`${form.received_date}T00:00:00`).toISOString()
          : new Date().toISOString(),
        status: form.status,
        currency_id: form.currency_id || null,
        currency_code: form.currency_code || selectedCurrency?.currency_code || null,
        total_amount: totals.total,
        notes: form.notes.trim() || null,
        metadata: {
          source: "customer_po_new_page",
          quotation_number: selectedQuotation?.quotation_number || null,
        },
        created_by: userId,
        updated_by: userId,
        project_id: form.project_id || null,
        task_id: form.task_id || null,
        reference_number: form.external_po_number.trim() || null,
        posted_to_ledger: false,
        company_name_snapshot: selectedCompany?.legal_name || selectedCompany?.name || null,
        company_legal_name_snapshot: selectedCompany?.legal_name || null,
        company_contact_person_snapshot: selectedCompany?.contact_person || null,
        company_email_snapshot: selectedCompany?.email || null,
        company_phone_snapshot: selectedCompany?.phone || null,
        company_address_snapshot: makeAddressSnapshot(selectedCompany),
        client_name_snapshot: selectedClient?.legal_name || selectedClient?.name || null,
        client_legal_name_snapshot: selectedClient?.legal_name || null,
        client_contact_person_snapshot: selectedClient?.contact_person || null,
        client_email_snapshot:
          selectedClient?.company_email || selectedClient?.personnel_email || null,
        client_phone_snapshot:
          selectedClient?.company_phone || selectedClient?.personnel_phone || null,
        billing_address_snapshot: makeAddressSnapshot(selectedClient),
        shipping_address_snapshot: makeAddressSnapshot(selectedClient),
        counterparty_type: "client",
        counterparty_company_id: null,
        is_intercompany: false,
        counterparty_name_snapshot:
          selectedClient?.legal_name || selectedClient?.name || null,
        counterparty_legal_name_snapshot: selectedClient?.legal_name || null,
        counterparty_contact_person_snapshot: selectedClient?.contact_person || null,
        counterparty_email_snapshot:
          selectedClient?.company_email || selectedClient?.personnel_email || null,
        counterparty_phone_snapshot:
          selectedClient?.company_phone || selectedClient?.personnel_phone || null,
      };

      const { data: createdPo, error: insertError } = await supabase
        .from("finance_client_purchase_orders")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) throw insertError;

      const linePayload = validLines.map((line, index) => ({
        client_po_id: createdPo.id,
        item_id: line.item_id || null,
        description: line.description,
        quantity: toNumber(line.quantity),
        unit_price: toNumber(line.unit_price),
        discount: toNumber(line.discount),
        sort_order: index + 1,
        unit_of_measure_id: line.unit_of_measure_id || null,
        tax_code_id: line.tax_code_id || null,
        revenue_category_id: line.revenue_category_id || null,
        project_id: form.project_id || null,
        task_id: form.task_id || null,
        status: "active",
        reference_number: form.external_po_number.trim() || null,
        notes: null,
        metadata: {
          source: form.quotation_id ? "quotation_or_manual" : "manual",
          quotation_id: form.quotation_id || null,
        },
        created_by: userId,
        updated_by: userId,
      }));

      const { error: lineInsertError } = await supabase
        .from("finance_client_purchase_order_line_items")
        .insert(linePayload);

      if (lineInsertError) throw lineInsertError;

      await uploadCustomerPoFile(createdPo.id, selectedFile, userId);

      navigate(`/finance/transactions/customer-pos/${createdPo.id}`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to create Customer PO."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoadingLookups) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Loading Customer PO sources...
          </div>
        </div>
      </div>
    );
  }

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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
              <div>
                <Badge className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                  New Customer PO
                </Badge>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Create Customer PO
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Create a received customer purchase order, copy quotation
                  lines when available, upload the customer PO document, and
                  preserve the source snapshots for the transaction flow.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-none">
                    Document required
                  </Badge>
                  <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200 shadow-none">
                    Quotation link optional
                  </Badge>
                  <Badge className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 shadow-none">
                    No manual refresh
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Client
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {selectedClient?.legal_name || selectedClient?.name || "—"}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Customer selected for this incoming purchase order.
                  </p>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Calculated Total
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {formatMoney(totals.total, form.currency_code || "USD")}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                      <Wallet className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Total amount is calculated from Customer PO line items.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => void handleCreateCustomerPo()}
                disabled={isSaving || isLoadingLookups}
                className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Creating..." : "Create Customer PO"}
              </Button>

              {error ? (
                <div className="flex min-h-11 items-center rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </header>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-transparent opacity-70" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Subtotal
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-cyan-100">
                  {formatMoney(totals.subtotal, form.currency_code || "USD")}
                </div>
                <div className="mt-2 truncate text-sm leading-6 text-slate-400">
                  Before discount and tax.
                </div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent opacity-70" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Discount
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-amber-100">
                  {formatMoney(totals.discount, form.currency_code || "USD")}
                </div>
                <div className="mt-2 truncate text-sm leading-6 text-slate-400">
                  Customer PO discount.
                </div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/20 via-violet-400/10 to-transparent opacity-70" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Tax
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-violet-100">
                  {formatMoney(totals.tax, form.currency_code || "USD")}
                </div>
                <div className="mt-2 truncate text-sm leading-6 text-slate-400">
                  Based on tax codes.
                </div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                <span className="h-2 w-2 rounded-full bg-violet-400" />
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-400/10 to-transparent opacity-70" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Total
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-emerald-100">
                  {formatMoney(totals.total, form.currency_code || "USD")}
                </div>
                <div className="mt-2 truncate text-sm leading-6 text-slate-400">
                  Customer PO value.
                </div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <div className="space-y-6">
            <Card className={activeSectionClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                    <SquarePen className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Document Overview
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Client, linked quotation, company, dates, currency, project, and status.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                <div className={summaryBlockClass}>
                  <div className={labelClass}>Client</div>
                  <select
                    value={form.client_id}
                    onChange={(event) => handleClientChange(event.target.value)}
                    disabled={isLoadingLookups}
                    className={fieldShellClass}
                  >
                    <option value="">Select client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.legal_name || client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Linked Quotation</div>
                  <select
                    value={form.quotation_id}
                    onChange={(event) => void handleQuotationChange(event.target.value)}
                    disabled={!form.client_id || isLoadingLookups}
                    className={fieldShellClass}
                  >
                    <option value="">
                      {form.client_id ? "No linked quotation" : "Select client first"}
                    </option>
                    {filteredQuotations.map((quotation) => (
                      <option key={quotation.id} value={quotation.id}>
                        {quotation.quotation_number || "Quotation"} —{" "}
                        {formatMoney(quotation.total_amount, quotation.currency_code || "USD")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Customer PO No.</div>
                  <input
                    value={form.external_po_number}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        external_po_number: event.target.value,
                      }))
                    }
                    className={fieldShellClass}
                    placeholder="Customer document number"
                  />
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Company</div>
                  <select
                    value={form.company_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        company_id: event.target.value,
                      }))
                    }
                    disabled={isLoadingLookups}
                    className={fieldShellClass}
                  >
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.legal_name || company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>PO Date</div>
                  <input
                    type="date"
                    value={form.po_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        po_date: event.target.value,
                      }))
                    }
                    className={fieldShellClass}
                  />
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Received Date</div>
                  <input
                    type="date"
                    value={form.received_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        received_date: event.target.value,
                      }))
                    }
                    className={fieldShellClass}
                  />
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Currency</div>
                  <select
                    value={form.currency_id}
                    onChange={(event) => handleCurrencyChange(event.target.value)}
                    disabled={isLoadingLookups}
                    className={fieldShellClass}
                  >
                    <option value="">Select currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.currency_code} — {currency.currency_name || ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Project</div>
                  <select
                    value={form.project_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        project_id: event.target.value,
                        task_id: "",
                      }))
                    }
                    disabled={isLoadingLookups}
                    className={fieldShellClass}
                  >
                    <option value="">No project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Task</div>
                  <select
                    value={form.task_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        task_id: event.target.value,
                      }))
                    }
                    disabled={isLoadingLookups}
                    className={fieldShellClass}
                  >
                    <option value="">No task</option>
                    {filteredTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Initial Status</div>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as CustomerPoStatus,
                      }))
                    }
                    className={fieldShellClass}
                  >
                    <option value="received">Received</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-3">
                  <div className={labelClass}>Notes</div>
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30"
                  />
                </div>
              </CardContent>
            </Card>

                        <Card className={activeSectionClass}>
              <CardHeader className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                      <SquarePen className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Customer PO Line Items
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Add products or services using the locked new/create line-item card pattern.
                      </CardDescription>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={addLine}
                  className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </CardHeader>

              <CardContent className="p-5">
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
                    const lineTotal =
                      base + base * (toNumber(selectedTaxCode?.rate_percent) / 100);

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
                              {formatMoney(lineTotal, form.currency_code || "USD")}
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
            <Card className={activeSectionClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Customer PO Document
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Upload the customer PO file. A document is required.
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
                  className={`flex min-h-[220px] w-full flex-col items-center justify-center rounded-[26px] border border-dashed px-6 py-8 text-center transition ${
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

                                <div className={summaryBlockClass}>
                  <div className={labelClass}>Summary</div>

                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Subtotal</span>
                      <span className="font-semibold text-white">
                        {formatMoney(totals.subtotal, form.currency_code || "USD")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Discount</span>
                      <span className="font-semibold text-white">
                        {formatMoney(totals.discount, form.currency_code || "USD")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Tax</span>
                      <span className="font-semibold text-white">
                        {formatMoney(totals.tax, form.currency_code || "USD")}
                      </span>
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-300">
                          Total
                        </span>
                        <span className="text-lg font-semibold text-white">
                          {formatMoney(totals.total, form.currency_code || "USD")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => void handleCreateCustomerPo()}
                  disabled={isSaving || isLoadingLookups}
                  className="h-11 w-full rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Creating..." : "Create Customer PO"}
                </Button>

                {error ? (
                  <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className={activeSectionClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Customer PO Summary
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Live document context before creation.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className={summaryBlockClass}>
                  <div className={labelClass}>Client</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedClient?.legal_name || selectedClient?.name || "—"}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Company</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedCompany?.legal_name || selectedCompany?.name || "—"}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Linked Quotation</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedQuotation?.quotation_number || "—"}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Currency</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedCurrency
                      ? `${selectedCurrency.currency_code} — ${
                          selectedCurrency.currency_name || ""
                        }`
                      : form.currency_code || "—"}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Project / Task</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedProject?.name || "—"}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {selectedTask?.title || "No task selected"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={activeSectionClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Creation Rules
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Locked Customer PO creation behavior.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 p-5 text-sm leading-6 text-slate-400">
                <div>• Internal CPO No. is generated automatically.</div>
                <div>• Customer PO No. comes from the customer document.</div>
                <div>• Linked quotation is filtered by selected client.</div>
                <div>• Quotation lines can be copied and adjusted.</div>
                <div>• Item lines come from Item Master or manual entry.</div>
                <div>• Total amount is calculated from Customer PO line items.</div>
                <div>• Customer PO document is required at creation.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
