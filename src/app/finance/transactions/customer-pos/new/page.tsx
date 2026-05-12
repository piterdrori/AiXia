"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle,
  FileText,
  Link2,
  Paperclip,
  Plus,
  Save,
  SquarePen,
  Trash2,
  Wallet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  AixiaAlert,
  AixiaButton,
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
  AixiaReviewGrid,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";

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

const todayIsoDate = new Date().toISOString().slice(0, 10);

const EMPTY_FORM: CustomerPoFormState = {
  client_id: "",
  quotation_id: "",
  external_po_number: "",
  company_id: "",
  po_date: todayIsoDate,
  received_date: todayIsoDate,
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

function getSelectedFileSizeLabel(file: File | null) {
  if (!file) return "No file selected";
  return `${(file.size / 1024 / 1024).toFixed(2)} MB`;
}

export default function FinanceNewCustomerPoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  const [isLoadingLookups, setIsLoadingLookups] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

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
          .eq("status", "accepted")
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

  useEffect(() => {
    const quotationIdFromUrl = searchParams.get("quotation_id");

    if (!quotationIdFromUrl || isLoadingLookups || quotations.length === 0) return;

    const quotationExists = quotations.some(
      (quotation) => quotation.id === quotationIdFromUrl
    );

    if (!quotationExists) return;

    void handleQuotationChange(quotationIdFromUrl);
  }, [isLoadingLookups, quotations, searchParams]);

  const filteredQuotations = useMemo(() => {
    if (!form.client_id) return quotations;
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

  const documentCurrencyCode =
    form.currency_code || selectedCurrency?.currency_code || "USD";

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
      client_id: quotation.client_id || current.client_id,
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
        company_name_snapshot:
          selectedCompany?.legal_name || selectedCompany?.name || null,
        company_legal_name_snapshot: selectedCompany?.legal_name || null,
        company_contact_person_snapshot: selectedCompany?.contact_person || null,
        company_email_snapshot: selectedCompany?.email || null,
        company_phone_snapshot: selectedCompany?.phone || null,
        company_address_snapshot: makeAddressSnapshot(selectedCompany),
        client_name_snapshot:
          selectedClient?.legal_name || selectedClient?.name || null,
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

      const linePayload = validLines.map((line, index) => {
        const selectedTaxCode = taxCodes.find(
          (taxCode) => taxCode.id === line.tax_code_id
        );
        const base = Math.max(
          toNumber(line.quantity) * toNumber(line.unit_price) -
            toNumber(line.discount),
          0
        );
        const taxAmount = base * (toNumber(selectedTaxCode?.rate_percent) / 100);

        return {
          client_po_id: createdPo.id,
          item_id: line.item_id || null,
          description: line.description,
          quantity: toNumber(line.quantity),
          unit_price: toNumber(line.unit_price),
          discount: toNumber(line.discount),
          line_total: base + taxAmount,
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
        };
      });

      const { error: lineInsertError } = await supabase
        .from("finance_client_purchase_order_line_items")
        .insert(linePayload);

      if (lineInsertError) throw lineInsertError;

      await uploadCustomerPoFile(createdPo.id, selectedFile, userId);

      if (form.quotation_id) {
        const { data: quotationMetadataRow, error: quotationMetadataError } =
          await supabase
            .from("finance_quotations")
            .select("metadata")
            .eq("id", form.quotation_id)
            .maybeSingle();

        if (quotationMetadataError) throw quotationMetadataError;

        const existingQuotationMetadata =
          quotationMetadataRow &&
          typeof quotationMetadataRow.metadata === "object" &&
          quotationMetadataRow.metadata !== null
            ? (quotationMetadataRow.metadata as Record<string, unknown>)
            : {};

        const { error: quotationUpdateError } = await supabase
          .from("finance_quotations")
          .update({
            status: "converted",
            metadata: {
              ...existingQuotationMetadata,
              converted_to_customer_po_id: createdPo.id,
              converted_to_customer_po_external_number:
                form.external_po_number.trim(),
              converted_to_customer_po_at: new Date().toISOString(),
              converted_to_customer_po_by: userId,
            },
            updated_by: userId,
          })
          .eq("id", form.quotation_id)
          .eq("status", "accepted");

        if (quotationUpdateError) throw quotationUpdateError;
      }

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
      <AixiaLoadingState
        title="Loading Customer PO sources"
        description="Clients, companies, currencies, quotations, items, units, tax codes, revenue categories, projects, and tasks are being loaded."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Customer POs"
        parentPath="/finance/transactions/customer-pos"
        badges={[
          { label: "New Customer PO", tone: "cyan" },
          { label: "Document Required", tone: selectedFile ? "emerald" : "rose" },
          { label: "Quotation Link Optional", tone: "violet" },
          { label: "No Manual Refresh", tone: "neutral" },
        ]}
        gradientTitle="CREATE CUSTOMER PO"
        title=""
        subtitle={
          selectedClient?.legal_name ||
          selectedClient?.name ||
          "Select customer"
        }
        description="Create a received customer purchase order, copy quotation lines when available, upload the customer PO document, and preserve the source snapshots for the transaction flow."
        statusCards={[
          {
            label: "Client",
            value: selectedClient?.legal_name || selectedClient?.name || "—",
            description: "Customer selected for this incoming purchase order.",
            icon: FileText,
            tone: "cyan",
          },
          {
            label: "Calculated Total",
            value: formatMoney(totals.total, documentCurrencyCode),
            description: "Total amount is calculated from Customer PO line items.",
            icon: Wallet,
            tone: "emerald",
          },
        ]}
      />

      {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}

      <div className="aixia-action-row">
        <AixiaButton
          type="button"
          variant="primary"
          onClick={() => void handleCreateCustomerPo()}
          disabled={isSaving || isLoadingLookups}
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Creating..." : "Create Customer PO"}
        </AixiaButton>
      </div>

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Subtotal"
          value={formatMoney(totals.subtotal, documentCurrencyCode)}
          description="Before discount and tax."
          icon={FileText}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Discount"
          value={formatMoney(totals.discount, documentCurrencyCode)}
          description="Customer PO discount."
          icon={FileText}
          tone="gold"
        />
        <AixiaMetricCard
          label="Tax"
          value={formatMoney(totals.tax, documentCurrencyCode)}
          description="Based on tax codes."
          icon={FileText}
          tone="violet"
        />
        <AixiaMetricCard
          label="Total"
          value={formatMoney(totals.total, documentCurrencyCode)}
          description="Customer PO value."
          icon={CheckCircle}
          tone="emerald"
        />
      </AixiaMetricGrid>

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        bottomSpan="never"
        sideRebalance="last-to-bottom"
        main={
          <>
            <AixiaSection
              title="Document Overview"
              description="Client, linked quotation, company, dates, currency, project, and status."
              icon={SquarePen}
            >
              <AixiaFormGrid columns="three">
                <AixiaFormField>
                  <AixiaFieldLabel label="Client" required />
                  <AixiaSelectField
                    value={form.client_id}
                    onChange={(event) => handleClientChange(event.target.value)}
                    disabled={isLoadingLookups}
                  >
                    <option value="">Select client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.legal_name || client.name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Linked Quotation" />
                  <AixiaSelectField
                    value={form.quotation_id}
                    onChange={(event) => void handleQuotationChange(event.target.value)}
                    disabled={!form.client_id || isLoadingLookups}
                  >
                    <option value="">
                      {form.client_id ? "No linked quotation" : "Select client first"}
                    </option>
                    {filteredQuotations.map((quotation) => (
                      <option key={quotation.id} value={quotation.id}>
                        {quotation.quotation_number || "Quotation"} —{" "}
                        {formatMoney(
                          quotation.total_amount,
                          quotation.currency_code || documentCurrencyCode
                        )}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Customer PO No." required />
                  <AixiaInputField
                    value={form.external_po_number}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        external_po_number: event.target.value,
                      }))
                    }
                    placeholder="Customer document number"
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Company" required />
                  <AixiaSelectField
                    value={form.company_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        company_id: event.target.value,
                      }))
                    }
                    disabled={isLoadingLookups}
                  >
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.legal_name || company.name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="PO Date" />
                  <AixiaInputField
                    type="date"
                    value={form.po_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        po_date: event.target.value,
                      }))
                    }
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Received Date" />
                  <AixiaInputField
                    type="date"
                    value={form.received_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        received_date: event.target.value,
                      }))
                    }
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Currency" required />
                  <AixiaSelectField
                    value={form.currency_id}
                    onChange={(event) => handleCurrencyChange(event.target.value)}
                    disabled={isLoadingLookups}
                  >
                    <option value="">Select currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.currency_code} — {currency.currency_name || ""}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Project" />
                  <AixiaSelectField
                    value={form.project_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        project_id: event.target.value,
                        task_id: "",
                      }))
                    }
                    disabled={isLoadingLookups}
                  >
                    <option value="">No project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Task" />
                  <AixiaSelectField
                    value={form.task_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        task_id: event.target.value,
                      }))
                    }
                    disabled={isLoadingLookups}
                  >
                    <option value="">No task</option>
                    {filteredTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Initial Status" />
                  <AixiaSelectField
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as CustomerPoStatus,
                      }))
                    }
                  >
                    <option value="received">Received</option>
                    <option value="draft">Draft</option>
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Notes" />
                  <AixiaTextareaField
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    rows={4}
                  />
                </AixiaFormFullWidth>
              </AixiaFormGrid>
            </AixiaSection>

            <AixiaSection
              title="Customer PO Line Items"
              description="Add products or services using the locked new/create line-item card pattern."
              icon={SquarePen}
              smartScroll
              visibleCards={8}
              actions={
                <AixiaButton type="button" variant="primary" onClick={addLine}>
                  <Plus className="h-4 w-4" />
                  Add Line
                </AixiaButton>
              }
            >
              <div className="aixia-form-row-list">
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
                              updateLine(
                                line.localId,
                                "description",
                                event.target.value
                              )
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

                        <AixiaValueBlock
                          label="Line Total"
                          value={formatMoney(lineTotal, documentCurrencyCode)}
                          detail="Quantity × unit price, less discount, plus tax"
                        />
                      </AixiaFormGrid>
                    </AixiaFormRowCard>
                  );
                })}
              </div>
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Customer PO Document"
              description="Upload the customer PO file. A document is required."
              icon={Paperclip}
            >
              <AixiaDocumentUploadPanel
                selectedFile={selectedFile}
                attachments={[]}
                required
                disabled={isSaving}
                uploading={isSaving}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                dropTitle="Drop Customer PO file here"
                dropDescription="Attach the original customer purchase order document. PDF, image, Word, or Excel files are supported."
                uploadLabel="Create Customer PO"
                uploadingLabel="Creating..."
                selectedFileLabel="Selected Customer PO document"
                emptyTitle="No Customer PO document selected"
                emptyDescription="Upload the original Customer PO document before creation."
                requiredMessage="Customer PO document is required at creation."
                onFileSelect={(file) => {
                  setSelectedFile(file);
                  setError("");
                }}
                onRemoveSelectedFile={() => setSelectedFile(null)}
                onUpload={() => void handleCreateCustomerPo()}
              />

              <AixiaValueBlock
                label="Selected File"
                value={selectedFile?.name || "Required"}
                detail={getSelectedFileSizeLabel(selectedFile)}
              />
            </AixiaSection>

            <AixiaSection
              title="Customer PO Summary"
              description="Live document context before creation."
              icon={FileText}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Client"
                  value={selectedClient?.legal_name || selectedClient?.name || "—"}
                  detail={makeAddressSnapshot(selectedClient) || "No client address"}
                />

                <AixiaValueBlock
                  label="Company"
                  value={selectedCompany?.legal_name || selectedCompany?.name || "—"}
                  detail={makeAddressSnapshot(selectedCompany) || "No company address"}
                />

                <AixiaValueBlock
                  label="Linked Quotation"
                  value={selectedQuotation?.quotation_number || "—"}
                  detail={
                    selectedQuotation
                      ? formatMoney(
                          selectedQuotation.total_amount,
                          selectedQuotation.currency_code || documentCurrencyCode
                        )
                      : "No quotation selected"
                  }
                />

                <AixiaValueBlock
                  label="Currency"
                  value={
                    selectedCurrency
                      ? `${selectedCurrency.currency_code} — ${
                          selectedCurrency.currency_name || ""
                        }`
                      : form.currency_code || "—"
                  }
                  detail="Selected from finance_currencies master data"
                />

                <AixiaValueBlock
                  label="Project / Task"
                  value={selectedProject?.name || "—"}
                  detail={selectedTask?.title || "No task selected"}
                />

                <AixiaValueBlock
                  label="Total"
                  value={formatMoney(totals.total, documentCurrencyCode)}
                  detail="Calculated from Customer PO line items"
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Creation Rules"
              description="Locked Customer PO creation behavior."
              icon={CheckCircle}
            >
              <div className="aixia-stack">
                <AixiaAlert tone="info">
                  Internal CPO No. is generated automatically.
                </AixiaAlert>
                <AixiaAlert tone="info">
                  Customer PO No. comes from the customer document.
                </AixiaAlert>
                <AixiaAlert tone="info">
                  Linked quotation is filtered by selected client.
                </AixiaAlert>
                <AixiaAlert tone="info">
                  Quotation lines can be copied and adjusted.
                </AixiaAlert>
                <AixiaAlert tone="info">
                  Item lines come from Item Master or manual entry.
                </AixiaAlert>
                <AixiaAlert tone="info">
                  Total amount is calculated from Customer PO line items.
                </AixiaAlert>
                <AixiaAlert tone="info">
                  Customer PO document is required at creation.
                </AixiaAlert>
              </div>
            </AixiaSection>
          </>
        }
      />
    </AixiaPage>
  );
}
