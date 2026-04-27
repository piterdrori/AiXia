"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle,
  Printer,
  Save,
  Trash2,
  SquarePen,
  ArrowRight,
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
  getProformaInvoicesArchiveList,
  getProformaInvoiceById,
  getProformaInvoiceLineItems,
  archiveProformaInvoice,
  softDeleteProformaInvoice,
  restoreProformaInvoice,
  permanentlyDeleteProformaInvoice,
  convertProformaToInvoice,
} from "@/lib/finance/proformaInvoices";

type ProformaRecord = {
  id: string;
  proforma_number: string | null;
  client_id: string | null;
  issue_date: string;
  valid_until: string | null;
  status:
    | "draft"
    | "sent"
    | "accepted"
    | "converted"
    | "archived"
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

function getProformaStatusBadgeClasses(status: ProformaRecord["status"]) {
  switch (status) {
    case "draft":
      return "border-white/10 bg-white/10 text-white/75";
    case "sent":
      return "border-sky-400/20 bg-sky-500/10 text-sky-200";
    case "accepted":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
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

function getProformaStatusLabel(status: ProformaRecord["status"]) {
  switch (status) {
    case "draft":
      return "Draft";
    case "sent":
      return "Sent";
    case "accepted":
      return "Accepted";
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
  const [linkedInvoice, setLinkedInvoice] = useState<InvoiceLinkRow | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [task, setTask] = useState<TaskRow | null>(null);
  const [archiveItems, setArchiveItems] = useState<ArchiveProformaRow[]>([]);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);

  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([]);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasureOption[]>([]);
  const [revenueCategories, setRevenueCategories] = useState<
    RevenueCategoryOption[]
  >([]);
  const [showArchivePopup, setShowArchivePopup] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">("archived");

  const [editingOverview, setEditingOverview] = useState(false);
  const [editingParties, setEditingParties] = useState(false);
  const [editingLines, setEditingLines] = useState(false);

  const [clientIdDraft, setClientIdDraft] = useState("");
  const [companyIdDraft, setCompanyIdDraft] = useState("");
  const [projectIdDraft, setProjectIdDraft] = useState("");
  const [taskIdDraft, setTaskIdDraft] = useState("");
  const [issueDateDraft, setIssueDateDraft] = useState("");
  const [validUntilDraft, setValidUntilDraft] = useState("");
  const [currencyIdDraft, setCurrencyIdDraft] = useState("");
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
        const [proformaRecord, proformaLines, invoiceResult] = await Promise.all([
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
          const { data: paymentTermData, error: paymentTermError } = await supabase
            .from("finance_payment_terms")
            .select("name, document_label, document_terms_text")
            .eq("id", typedProforma.payment_terms_id)
            .maybeSingle();

          if (paymentTermError) {
            console.warn("Failed to load proforma payment term wording:", paymentTermError);
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
            setProject(((projectRows || [])[0] as ProjectRow | undefined) || null);
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

        setClientIdDraft(typedProforma.client_id || "");
        setCompanyIdDraft(
          ((typedProforma.metadata?.issuing_company_id as string | undefined) || "")
        );
        setProjectIdDraft(typedProforma.project_id || "");
        setTaskIdDraft(typedProforma.task_id || "");
        setIssueDateDraft(typedProforma.issue_date || "");
        setValidUntilDraft(typedProforma.valid_until || "");
        setCurrencyIdDraft(typedProforma.currency_id || "");
        setNotesDraft(typedProforma.notes || "");

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
          .from("finance_currencies")
          .select("id, currency_code, currency_name")
          .eq("status", "active")
          .order("currency_code", { ascending: true }),
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
      if (itemsResult.error) throw itemsResult.error;
      if (taxCodesResult.error) throw taxCodesResult.error;
      if (unitsOfMeasureResult.error) throw unitsOfMeasureResult.error;
      if (revenueCategoriesResult.error) throw revenueCategoriesResult.error;

      setClients((clientsResult.data || []) as ClientOption[]);
      setCompanies((companiesResult.data || []) as CompanyOption[]);
      setProjects((projectsResult.data || []) as ProjectRow[]);
      setTasks((tasksResult.data || []) as TaskRow[]);
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
      setItems((itemsResult.data || []) as ItemOption[]);
      setTaxCodes((taxCodesResult.data || []) as TaxCodeOption[]);
      setUnitsOfMeasure((unitsOfMeasureResult.data || []) as UnitOfMeasureOption[]);
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

  const filteredDraftTasks = useMemo(() => {
    if (!projectIdDraft) return tasks;
    return tasks.filter((taskItem) => taskItem.project_id === projectIdDraft);
  }, [projectIdDraft, tasks]);

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
      const taxCode = taxCodes.find((taxCodeItem) => taxCodeItem.id === row.tax_code_id);

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

  useEffect(() => {
    if (!proforma || proforma.status !== "draft" || !selectedDraftClient) return;

    if (selectedDraftClient.currency_code && !currencyIdDraft) {
      const matchedCurrency = currencies.find(
        (currency) => currency.currency_code === selectedDraftClient.currency_code
      );

      if (matchedCurrency) {
        setCurrencyIdDraft(matchedCurrency.id);
      }
    }

    if (!validUntilDraft) {
      const days = selectedDraftClient.payment_terms_days ?? 14;
      const base = new Date(issueDateDraft || new Date().toISOString().slice(0, 10));
      base.setDate(base.getDate() + days);
      setValidUntilDraft(base.toISOString().slice(0, 10));
    }
  }, [
    currencies,
    currencyIdDraft,
    issueDateDraft,
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

  const canEditDraft = proforma?.status === "draft";
  const canMarkSent = proforma?.status === "draft";
  const canAccept = proforma?.status === "sent";
  const canConvert = proforma?.status === "accepted";

  const handleMarkSent = useCallback(async () => {
    if (!proforma || !id) return;

    setIsSavingDraft(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("finance_proforma_invoices")
        .update({
          status: "sent",
        })
        .eq("id", id)
        .eq("status", "draft");

      if (updateError) throw updateError;

      await loadProforma(true);
    } catch (err) {
      console.error(err);
      setError("Failed to mark proforma invoice as sent.");
    } finally {
      setIsSavingDraft(false);
    }
  }, [id, loadProforma, proforma]);

  const handleAccept = useCallback(async () => {
    if (!proforma || !id) return;

    setIsSavingDraft(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("finance_proforma_invoices")
        .update({
          status: "accepted",
        })
        .eq("id", id)
        .eq("status", "sent");

      if (updateError) throw updateError;

      await loadProforma(true);
    } catch (err) {
      console.error(err);
      setError("Failed to mark proforma invoice as accepted.");
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
            currency_code:
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

      setEditingOverview(false);
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
    canEditDraft,
    clientIdDraft,
    companyIdDraft,
    currencyIdDraft,
    id,
    issueDateDraft,
    lineItemsDraft,
    loadProforma,
    notesDraft,
    proforma,
    projectIdDraft,
    selectedDraftCurrency,
    taskIdDraft,
    validUntilDraft,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-slate-400">
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
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-slate-400">
            Proforma invoice not found.
          </div>
        </div>
      </div>
    );
  }

  const printableCurrencyCode =
    selectedDraftCurrency?.currency_code ||
    (proforma.metadata?.currency_code as string | undefined) ||
    "USD";

  const visibleArchiveItems = archiveItems.filter(
    (item) => item.status === archiveTab
  );

  return (
    <>
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

            <div className="relative">
              <Button
                variant="outline"
                onClick={() => navigate("/finance/transactions/proforma-invoices")}
                className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Proforma Invoices
              </Button>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-stretch">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                      Receivables
                    </Badge>

                    <Badge className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200 shadow-none">
                      Proforma Workspace
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                      {proforma.proforma_number ||
                        (proforma.status === "draft"
                          ? "Draft Proforma"
                          : proforma.status === "converted"
                            ? "Converted Proforma"
                            : "Proforma Invoice")}
                    </h1>

                    <Badge
                      className={`rounded-full border px-3 py-1 text-xs shadow-none ${getProformaStatusBadgeClasses(
                        proforma.status
                      )}`}
                    >
                      {getProformaStatusLabel(proforma.status)}
                    </Badge>

                    {linkedInvoice ? (
                      <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200 shadow-none">
                        Linked Invoice
                      </Badge>
                    ) : null}
                  </div>

                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                    Commercial pre-invoice document used before formal invoice issuance. Drafts are
                    editable. Accepted proformas can be converted into invoices.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200 shadow-none">
                      {formatFinanceMoney(financialSummary?.total ?? 0, printableCurrencyCode)}
                    </Badge>
                    <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-none">
                      {lineItems.length} Lines
                    </Badge>
                    <Badge className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 shadow-none">
                      Auto-Refresh
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Issue Date
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                      {formatFinanceDate(proforma.issue_date)}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Date the commercial proforma was created.
                    </p>
                  </div>

                  <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Valid Until
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                      {formatFinanceDate(proforma.valid_until)}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Validity period for the commercial offer.
                    </p>
                  </div>

                  <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Currency
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                      {printableCurrencyCode}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Currency used in totals and print output.
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

                {canMarkSent ? (
                  <Button
                    onClick={() => void handleMarkSent()}
                    disabled={isSavingDraft}
                    className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isSavingDraft ? "Updating..." : "Mark as Sent"}
                  </Button>
                ) : null}

                                {canAccept ? (
                  <Button
                    onClick={() => void handleAccept()}
                    disabled={isSavingDraft}
                    className="h-11 rounded-2xl border border-emerald-400/20 bg-emerald-500 px-4 font-semibold text-slate-950 hover:bg-emerald-400"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isSavingDraft ? "Updating..." : "Mark as Accepted"}
                  </Button>
                ) : null}

                {canConvert ? (
                  <Button
                    onClick={() => void handleConvert()}
                    disabled={isConverting}
                    className="h-11 rounded-2xl border border-violet-400/20 bg-violet-500 px-4 font-semibold text-white hover:bg-violet-400"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isConverting ? "Converting..." : "Convert to Invoice"}
                  </Button>
                ) : null}

                {proforma.status !== "archived" && proforma.status !== "deleted" ? (
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

                {proforma.status !== "deleted" && proforma.status !== "converted" ? (
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

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
            <div className="space-y-6">
              <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <CardHeader className="border-b border-white/10 px-5 py-4">
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
                          onClick={() => void handleSaveDraftChanges()}
                          disabled={isSavingDraft}
                          className="h-9 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-3 text-slate-950 hover:bg-cyan-400"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingDraft ? "Saving..." : "Save"}
                        </Button>
                      ) : null}

                      {canEditDraft ? (
                        <Button
                          variant="outline"
                          onClick={() => setEditingOverview((current) => !current)}
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
                        <div className="text-sm text-white/70">Project</div>
                        <select
                          value={projectIdDraft}
                          onChange={(event) => setProjectIdDraft(event.target.value)}
                          className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                        >
                          <option value="">No project</option>
                          {projects.map((projectItem) => (
                            <option key={projectItem.id} value={projectItem.id}>
                              {projectItem.name}
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
                          {filteredDraftTasks.map((taskItem) => (
                            <option key={taskItem.id} value={taskItem.id}>
                              {taskItem.title}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <div className="text-sm text-white/70">Issue Date</div>
                        <input
                          type="date"
                          value={issueDateDraft}
                          onChange={(event) => setIssueDateDraft(event.target.value)}
                          className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                        />
                      </label>

                      <label className="space-y-2">
                        <div className="text-sm text-white/70">Valid Until</div>
                        <input
                          type="date"
                          value={validUntilDraft}
                          onChange={(event) => setValidUntilDraft(event.target.value)}
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

                      <div className="md:col-span-3">
                        <div className="text-sm text-white/70">Notes</div>
                        <textarea
                          value={notesDraft}
                          onChange={(event) => setNotesDraft(event.target.value)}
                          rows={4}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Issuing Company
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {selectedDraftCompany?.legal_name ||
                            selectedDraftCompany?.name ||
                            companies.find(
                              (company) =>
                                company.id ===
                                (proforma.metadata?.issuing_company_id as string | undefined)
                            )?.legal_name ||
                            companies.find(
                              (company) =>
                                company.id ===
                                (proforma.metadata?.issuing_company_id as string | undefined)
                            )?.name ||
                            "—"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Client
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {selectedDraftClient?.legal_name ||
                            selectedDraftClient?.name ||
                            clients.find((client) => client.id === proforma.client_id)
                              ?.legal_name ||
                            clients.find((client) => client.id === proforma.client_id)
                              ?.name ||
                            "—"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Payment Terms
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {proforma.payment_terms_snapshot || "—"}
                        </div>
                        {proforma.payment_terms_document_text ? (
                          <div className="mt-2 text-sm leading-6 text-white/55">
                            {proforma.payment_terms_document_text}
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Issue Date
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {formatFinanceDate(proforma.issue_date)}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Valid Until
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {formatFinanceDate(proforma.valid_until)}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Currency
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {selectedDraftCurrency
                            ? `${selectedDraftCurrency.currency_code} — ${selectedDraftCurrency.currency_name}`
                            : (proforma.metadata?.currency_code as string | undefined) || "USD"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Project
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {selectedDraftProject?.name || project?.name || "—"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Task
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {selectedDraftTask?.title || task?.title || "—"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Status
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {getProformaStatusLabel(proforma.status)}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 md:col-span-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Notes
                        </div>
                        <div className="mt-2 text-sm leading-6 text-white/70">
                          {proforma.notes || "—"}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-white">Document Parties</CardTitle>
                      <CardDescription className="text-white/45">
                        Party identity and commercial contact information.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingParties ? (
                        <Button
                          onClick={() => void handleSaveDraftChanges()}
                          disabled={isSavingDraft}
                          className="h-9 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-3 text-slate-950 hover:bg-cyan-400"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingDraft ? "Saving..." : "Save"}
                        </Button>
                      ) : null}

                      {canEditDraft ? (
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
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Issuing Company
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-white/75">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Legal Name
                        </div>
                        <div className="mt-1 font-semibold text-white">
                          {selectedDraftCompany?.legal_name ||
                            selectedDraftCompany?.name ||
                            companies.find(
                              (company) =>
                                company.id ===
                                (proforma.metadata?.issuing_company_id as string | undefined)
                            )?.legal_name ||
                            companies.find(
                              (company) =>
                                company.id ===
                                (proforma.metadata?.issuing_company_id as string | undefined)
                            )?.name ||
                            "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Contact Person
                        </div>
                        <div className="mt-1">{selectedDraftCompany?.contact_person || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Email
                        </div>
                        <div className="mt-1">{selectedDraftCompany?.email || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Phone
                        </div>
                        <div className="mt-1">{selectedDraftCompany?.phone || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Primary Address
                        </div>
                        <div className="mt-1 leading-6">
                          {[
                            selectedDraftCompany?.address_line_1,
                            selectedDraftCompany?.address_line_2,
                            selectedDraftCompany?.city,
                            selectedDraftCompany?.state_province,
                            selectedDraftCompany?.postal_code,
                            selectedDraftCompany?.country,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Client
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-white/75">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Legal Name
                        </div>
                        <div className="mt-1 font-semibold text-white">
                          {selectedDraftClient?.legal_name || selectedDraftClient?.name || "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Contact Person
                        </div>
                        <div className="mt-1">{selectedDraftClient?.contact_person || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Email
                        </div>
                        <div className="mt-1">
                          {selectedDraftClient?.company_email ||
                            selectedDraftClient?.personnel_email ||
                            "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Phone
                        </div>
                        <div className="mt-1">
                          {selectedDraftClient?.company_phone ||
                            selectedDraftClient?.personnel_phone ||
                            "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Primary Address
                        </div>
                        <div className="mt-1 leading-6">
                          {[
                            selectedDraftClient?.address_line_1,
                            selectedDraftClient?.address_line_2,
                            selectedDraftClient?.city,
                            selectedDraftClient?.state_province,
                            selectedDraftClient?.postal_code,
                            selectedDraftClient?.country,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-white">Line Items</CardTitle>
                      <CardDescription className="text-white/45">
                        Draft proforma invoices can be edited here. Sent, accepted, and converted
                        records are read-only.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingLines ? (
                        <Button
                          onClick={() => void handleSaveDraftChanges()}
                          disabled={isSavingDraft}
                          className="h-9 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-3 text-slate-950 hover:bg-cyan-400"
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

                      {canEditDraft ? (

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
                        editableBase * (toNumber(String(editableTaxRate)) / 100)
                      : toNumber((row as ProformaLineItemRow).line_total);

                    return (
                      <div
                        key={(row as EditableLineItem | ProformaLineItemRow).id}
                        className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                      >
                        <div className="mb-4 flex items-center justify-between gap-4">
                          <div className="text-sm font-medium text-white">
                            Line {index + 1}
                          </div>

                          {editable && canEditDraft ? (
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
                                    ((row as EditableLineItem).item_id ||
                                      (row as any).item_id)
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
                                  printableCurrencyCode
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
                                  printableCurrencyCode
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
                            <div className="text-sm text-white/70">
                              Revenue Category
                            </div>
                            {editable ? (
                              <select
                                value={(row as EditableLineItem).revenue_category_id}
                                onChange={(event) =>
                                  setLineItemsDraft((current) =>
                                    current.map((entry) =>
                                      entry.id === (row as EditableLineItem).id
                                        ? {
                                            ...entry,
                                            revenue_category_id:
                                              event.target.value,
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
              <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <CardTitle className="text-white">Financial Summary</CardTitle>
                  <CardDescription className="text-white/45">
                    Live totals and linked invoice state.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Subtotal
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.subtotal ?? 0,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Discount
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.discount ?? 0,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Tax
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.tax ?? 0,
                        printableCurrencyCode
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
                        printableCurrencyCode
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <CardTitle className="text-white">Linked Invoice</CardTitle>
                  <CardDescription className="text-white/45">
                    Invoice created from this proforma after conversion.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  {!linkedInvoice ? (
                    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/45">
                      No linked invoice yet.
                    </div>
                  ) : (
                    <>
                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Invoice
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {linkedInvoice.invoice_number || "—"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Status
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {linkedInvoice.status || "—"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Payment Status
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {linkedInvoice.payment_status || "—"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Total
                        </div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {formatFinanceMoney(
                            linkedInvoice.total_amount,
                            linkedInvoice.currency_code || printableCurrencyCode
                          )}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Paid
                        </div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {formatFinanceMoney(
                            linkedInvoice.paid_amount,
                            linkedInvoice.currency_code || printableCurrencyCode
                          )}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-amber-400/15 bg-amber-500/10 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-amber-100/70">
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
                          navigate(`/finance/transactions/invoices/${linkedInvoice.id}`)
                        }
                        className="h-11 w-full rounded-2xl border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.08]"
                      >
                        Open Linked Invoice
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

                            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-white">Archive</CardTitle>
                      <CardDescription className="text-white/45">
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
                  <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-6 text-white/55">
                    Delete logic is soft-first. Archive moves the proforma invoice to archived
                    state. Hard delete is only available inside the archive list.
                  </div>

                  {showArchivePopup ? (
                    <div className="space-y-3 rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-white">
                          Archive Records
                        </div>

                        <div className="flex items-center gap-2">
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
                      </div>

                      {visibleArchiveItems.length === 0 ? (
                        <div className="text-sm text-white/45">
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
                                    {item.proforma_number || "Archived Proforma"}
                                  </div>

                                  <div className="mt-1 text-xs text-white/45">
                                    {formatFinanceDate(item.updated_at || null)}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="text-sm text-white/65">
                                    {formatFinanceMoney(
                                      toNumber(item.total_amount),
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

                                  {item.status === "deleted" ? (
                                    <Button
                                      variant="outline"
                                      onClick={() => void handleHardDelete(item.id)}
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
        proforma={{
          ...proforma,
          currency_code: printableCurrencyCode,
        }}
        lineItems={lineItems}
        financialSummary={financialSummary}
        project={project}
        task={task}
        company={selectedDraftCompany}
        client={selectedDraftClient}
      />
    </>
  );
}



        
