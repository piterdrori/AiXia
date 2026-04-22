"use client";

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

type QuotationRecord = {
  id: string;
  quotation_number: string | null;
  client_id: string | null;
  company_id: string | null;
  issue_date: string;
  valid_until: string | null;
  status:
    | "draft"
    | "issued"
    | "sent"
    | "accepted"
    | "rejected"
    | "expired"
    | "converted"
    | "archived"
    | "deleted";
  subtotal: number | string | null;
  tax_amount: number | string | null;
  discount_amount: number | string | null;
  total_amount: number | string | null;
  currency_id: string | null;
  currency_code: string | null;
  project_id: string | null;
  task_id: string | null;
  notes: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  client_name_snapshot: string | null;
  client_contact_person_snapshot?: string | null;
  billing_address_snapshot?: string | null;
  client_email_snapshot?: string | null;
  client_phone_snapshot?: string | null;
  company_name_snapshot: string | null;
  company_contact_person_snapshot?: string | null;
  company_address_snapshot?: string | null;
  company_email_snapshot?: string | null;
  company_phone_snapshot?: string | null;
  terms_and_conditions_snapshot?: string | null;
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

function getQuotationStatusBadgeClasses(status: QuotationRecord["status"]) {
  switch (status) {
    case "draft":
      return "border-white/10 bg-white/10 text-white/75";
    case "issued":
      return "border-sky-400/20 bg-sky-500/10 text-sky-200";
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

function getQuotationStatusLabel(status: QuotationRecord["status"]) {
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

export default function FinanceQuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingIssued, setIsMarkingIssued] = useState(false);
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

      if (refreshOnly) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
                const [quotationResult, lineItemsResult, poResult] =
          await Promise.all([
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
                  "subtotal",
                  "tax_amount",
                  "discount_amount",
                  "total_amount",
                  "currency_id",
                  "currency_code",
                  "project_id",
                  "task_id",
                  "notes",
                  "metadata",
                  "created_at",
                  "updated_at",
                  "created_by",
                  "updated_by",
                  "client_name_snapshot",
                  "client_contact_person_snapshot",
                  "billing_address_snapshot",
                  "client_email_snapshot",
                  "client_phone_snapshot",
                  "company_name_snapshot",
                  "company_contact_person_snapshot",
                  "company_address_snapshot",
                  "company_email_snapshot",
                  "company_phone_snapshot",
                  "terms_and_conditions_snapshot",
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

        if (quotationResult.error) {
          throw quotationResult.error;
        }

        if (lineItemsResult.error) {
          throw lineItemsResult.error;
        }

        if (poResult.error) {
          throw poResult.error;
        }

        const typedQuotation = quotationResult.data as QuotationRecord | null;
        const typedLineItems =
          (lineItemsResult.data || []) as unknown as QuotationLineItemRow[];
        const typedClientPO = (poResult.data || null) as ClientPORow | null;

        setQuotation(typedQuotation);
        setLineItems(typedLineItems);
        setLinkedClientPO(typedClientPO);

        if (typedQuotation) {
          setClientIdDraft(typedQuotation.client_id || "");
          setCompanyIdDraft(typedQuotation.company_id || "");
          setProjectIdDraft(typedQuotation.project_id || "");
          setTaskIdDraft(typedQuotation.task_id || "");
          setIssueDateDraft(typedQuotation.issue_date || "");
          setValidUntilDraft(typedQuotation.valid_until || "");
          setCurrencyIdDraft(typedQuotation.currency_id || "");
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

  const filteredDraftTasks = useMemo(() => {
    if (!projectIdDraft) {
      return tasks;
    }

    return tasks.filter((task) => task.project_id === projectIdDraft);
  }, [projectIdDraft, tasks]);

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

  const financialSummary = useMemo(() => {
    if (!quotation || !totals) return null;

    if (quotation.status === "draft") {
      return {
        subtotal: draftTotals.subtotal,
        discount: draftTotals.discount,
        tax: draftTotals.tax,
        total: draftTotals.total,
      };
    }

    return totals;
  }, [draftTotals, quotation, totals]);

  useEffect(() => {
    if (!quotation || quotation.status !== "draft" || !selectedDraftClient) return;

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
    quotation,
    selectedDraftClient,
    validUntilDraft,
  ]);

  useEffect(() => {
    if (!quotation || quotation.status !== "draft") return;

    const taskStillValid = filteredDraftTasks.some((task) => task.id === taskIdDraft);

    if (taskIdDraft && !taskStillValid) {
      setTaskIdDraft("");
    }
  }, [filteredDraftTasks, quotation, taskIdDraft]);

  const canEditDraft = quotation?.status === "draft";
  const canMarkIssued = quotation?.status === "draft";
  const canMarkSent = quotation?.status === "issued";
  const canMarkAccepted = quotation?.status === "sent";
  const canMarkRejected =
    quotation?.status === "sent" || quotation?.status === "issued";

  const handleMarkIssued = useCallback(async () => {
    if (!quotation || !id) return;

    setIsMarkingIssued(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("finance_quotations")
        .update({
          status: "issued",
        })
        .eq("id", id)
        .eq("status", "draft");

      if (updateError) throw updateError;

      await loadQuotation(true);
    } catch (err) {
      console.error(err);
      setError("Failed to mark quotation as issued.");
    } finally {
      setIsMarkingIssued(false);
    }
  }, [id, loadQuotation, quotation]);

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
        .eq("status", "issued");

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
        .in("status", ["issued", "sent"]);

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
      setEditingParties(false);
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
      setEditingParties(false);
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
        const { error } = await supabase
          .from("finance_quotations")
          .update({
            status: "draft",
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
    if (!quotation || !id || !canEditDraft) return;

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
      setError("Draft quotation must include at least one valid line item.");
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
        "Every draft quotation line must have a description or item name, quantity greater than 0, and unit price 0 or higher."
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

      const { error: quotationError } = await supabase
        .from("finance_quotations")
        .update({
          client_id: clientIdDraft || null,
          company_id: companyIdDraft || null,
          issue_date: issueDateDraft,
          valid_until: validUntilDraft || null,
          currency_id: currencyIdDraft || null,
          currency_code:
            selectedDraftCurrency?.currency_code ||
            quotation.currency_code ||
            "USD",
          project_id: projectIdDraft || null,
          task_id: taskIdDraft || null,
          notes: notesDraft || null,
          terms_and_conditions_snapshot: termsAndConditionsDraft || null,
          client_name_snapshot:
            selectedDraftClient?.legal_name ||
            selectedDraftClient?.name ||
            quotation.client_name_snapshot,
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
            [
              selectedDraftClient?.address_line_1,
              selectedDraftClient?.address_line_2,
              selectedDraftClient?.city,
              selectedDraftClient?.state_province,
              selectedDraftClient?.postal_code,
              selectedDraftClient?.country,
            ]
              .filter(Boolean)
              .join(", ") || quotation.billing_address_snapshot || null,
          company_name_snapshot:
            selectedDraftCompany?.legal_name ||
            selectedDraftCompany?.name ||
            quotation.company_name_snapshot,
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
            [
              selectedDraftCompany?.address_line_1,
              selectedDraftCompany?.address_line_2,
              selectedDraftCompany?.city,
              selectedDraftCompany?.state_province,
              selectedDraftCompany?.postal_code,
              selectedDraftCompany?.country,
            ]
              .filter(Boolean)
              .join(", ") || quotation.company_address_snapshot || null,
          subtotal: draftTotals.subtotal,
          discount_amount: draftTotals.discount,
          tax_amount: draftTotals.tax,
          total_amount: draftTotals.total,
          updated_by: user.id,
        })
        .eq("id", id)
        .eq("status", "draft");

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
          item_id: row.item_id || null,
          item_name: row.item_name || row.description.trim() || null,
          description: row.description.trim() || null,
          quantity: qty,
          unit_price: unitPrice,
          discount: toNumber(row.discount),
          discount_rate: toNumber(row.discount_rate),
          tax_code_id: row.tax_code_id || null,
          tax_rate: ratePercent,
          unit_of_measure_id: row.unit_of_measure_id || null,
          revenue_category_id: row.revenue_category_id || null,
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
      setEditingParties(false);
      setEditingLines(false);
      await loadQuotation(true);
    } catch (err) {
      console.error(err);
      setError("Failed to save draft quotation changes.");
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    canEditDraft,
    clientIdDraft,
    companyIdDraft,
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
    projectIdDraft,
    quotation,
    selectedDraftClient,
    selectedDraftCompany,
    selectedDraftCurrency,
    taskIdDraft,
    taxCodes,
    termsAndConditionsDraft,
    validUntilDraft,
  ]);

  if (isLoading) {
    return <div className="p-6 text-white/50">Loading quotation...</div>;
  }

  if (!quotation || !totals) {
    return <div className="p-6 text-white/50">Quotation not found.</div>;
  }

  const printableCurrencyCode =
    selectedDraftCurrency?.currency_code || quotation.currency_code || "USD";

  const visibleArchiveItems = archiveItems.filter(
    (item) => item.status === archiveTab
  );

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
                      Quotation workspace
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        {quotation.quotation_number || "Quotation"}
                      </h1>

                      <Badge
                        className={`rounded-full border px-3 py-1 text-xs shadow-none ${getQuotationStatusBadgeClasses(
                          quotation.status
                        )}`}
                      >
                        {getQuotationStatusLabel(quotation.status)}
                      </Badge>

                      {linkedClientPO ? (
                        <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200 shadow-none">
                          Linked Client PO
                        </Badge>
                      ) : null}
                    </div>

                    <div className="text-sm text-white/50">
                      Commercial offer before client PO, PI, invoice, and payment.
                      Draft quotations are editable. Accepted quotations can move
                      downstream into customer commitment.
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 xl:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/finance/transactions/quotations")}
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

                  {canMarkIssued ? (
                    <Button
                      onClick={() => void handleMarkIssued()}
                      disabled={isMarkingIssued}
                      className="h-11 rounded-2xl px-4"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {isMarkingIssued ? "Updating..." : "Mark as Issued"}
                    </Button>
                  ) : null}

                  {canMarkSent ? (
                    <Button
                      onClick={() => void handleMarkSent()}
                      disabled={isMarkingSent}
                      className="h-11 rounded-2xl px-4"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {isMarkingSent ? "Updating..." : "Mark as Sent"}
                    </Button>
                  ) : null}

                  {canMarkAccepted ? (
                    <Button
                      onClick={() => void handleMarkAccepted()}
                      disabled={isMarkingAccepted}
                      className="h-11 rounded-2xl px-4"
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
                      {isMarkingRejected ? "Updating..." : "Mark as Rejected"}
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
                      <Trash2 className="mr-2 h-4 w-4" />
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

                  <Button
                    variant="outline"
                    onClick={() => void loadQuotation(true)}
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
                      <CardTitle className="text-white">
                        Document Overview
                      </CardTitle>
                      <CardDescription className="text-white/45">
                        Commercial header, project references, currency, dates,
                        and quotation lifecycle state.
                      </CardDescription>
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
                          onClick={() => setEditingOverview((current) => !current)}
                          className="h-9 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
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
                        <div className="text-sm text-white/70">
                          Issuing Company
                        </div>
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
                          onChange={(e) => setIssueDateDraft(e.target.value)}
                          className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                        />
                      </label>

                      <label className="space-y-2">
                        <div className="text-sm text-white/70">Valid Until</div>
                        <input
                          type="date"
                          value={validUntilDraft}
                          onChange={(e) => setValidUntilDraft(e.target.value)}
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

                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Status
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {getQuotationStatusLabel(quotation.status)}
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
                          {selectedDraftCompany?.legal_name ||
                            selectedDraftCompany?.name ||
                            quotation.company_name_snapshot ||
                            "—"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Client
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {selectedDraftClient?.legal_name ||
                            selectedDraftClient?.name ||
                            quotation.client_name_snapshot ||
                            "—"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Issue Date
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {formatFinanceDate(quotation.issue_date)}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Valid Until
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {formatFinanceDate(quotation.valid_until)}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Currency
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {selectedDraftCurrency
                            ? `${selectedDraftCurrency.currency_code} — ${selectedDraftCurrency.currency_name}`
                            : quotation.currency_code || "USD"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Project
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {selectedDraftProject?.name || "—"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Task
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {selectedDraftTask?.title || "—"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Status
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {getQuotationStatusLabel(quotation.status)}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3 md:col-span-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Notes
                        </div>
                        <div className="mt-2 text-sm leading-6 text-white/70">
                          {quotation.notes || "—"}
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
                      <CardTitle className="text-white">
                        Document Parties
                      </CardTitle>
                      <CardDescription className="text-white/45">
                        Company and client identity snapshots plus quotation
                        terms and conditions.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingParties ? (
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
                          onClick={() => setEditingParties((current) => !current)}
                          className="h-9 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
                        >
                          <SquarePen className="mr-2 h-4 w-4" />
                          {editingParties ? "Close" : "Edit"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
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
                          {selectedDraftCompany?.legal_name ||
                            selectedDraftCompany?.name ||
                            quotation.company_name_snapshot ||
                            "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Contact Person
                        </div>
                        <div className="mt-1">
                          {selectedDraftCompany?.contact_person ||
                            quotation.company_contact_person_snapshot ||
                            "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Email
                        </div>
                        <div className="mt-1">
                          {selectedDraftCompany?.email ||
                            quotation.company_email_snapshot ||
                            "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Phone
                        </div>
                        <div className="mt-1">
                          {selectedDraftCompany?.phone ||
                            quotation.company_phone_snapshot ||
                            "—"}
                        </div>
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
                            .join(", ") ||
                            quotation.company_address_snapshot ||
                            "—"}
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
                          {selectedDraftClient?.legal_name ||
                            selectedDraftClient?.name ||
                            quotation.client_name_snapshot ||
                            "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Contact Person
                        </div>
                        <div className="mt-1">
                          {selectedDraftClient?.contact_person ||
                            quotation.client_contact_person_snapshot ||
                            "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Email
                        </div>
                        <div className="mt-1">
                          {selectedDraftClient?.company_email ||
                            selectedDraftClient?.personnel_email ||
                            quotation.client_email_snapshot ||
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
                            quotation.client_phone_snapshot ||
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
                            .join(", ") ||
                            quotation.billing_address_snapshot ||
                            "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-white/8 bg-black/15 p-4 md:col-span-2">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Terms &amp; Conditions
                    </div>

                    {editingParties ? (
                      <textarea
                        value={termsAndConditionsDraft}
                        onChange={(event) =>
                          setTermsAndConditionsDraft(event.target.value)
                        }
                        rows={7}
                        className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
                      />
                    ) : (
                      <div className="mt-3 whitespace-pre-line text-sm leading-6 text-white/75">
                        {quotation.terms_and_conditions_snapshot || "—"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <CardHeader className="border-b border-white/8 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-white">Line Items</CardTitle>
                      <CardDescription className="text-white/45">
                        Draft quotations can be edited here. Issued, sent,
                        accepted, rejected, and converted records are read-only.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingLines ? (
                        <Button
                          onClick={() => void handleSaveDraftChanges()}
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

                      {canEditDraft ? (
                        <Button
                          variant="outline"
                          onClick={() => setEditingLines((current) => !current)}
                          className="h-9 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
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
                        (toNumber((row as EditableLineItem).discount) > 0
                          ? toNumber((row as EditableLineItem).discount)
                          : toNumber((row as EditableLineItem).quantity) *
                              toNumber((row as EditableLineItem).unit_price) *
                              (toNumber((row as EditableLineItem).discount_rate) / 100)),
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
                                removeDraftLineItem((row as EditableLineItem).id)
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
                                {(row as QuotationLineItemRow).item_name || "—"}
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
                                        ? {
                                            ...entry,
                                            description: event.target.value,
                                          }
                                        : entry
                                    )
                                  )
                                }
                                className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                              />
                            ) : (
                              <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                                {(row as QuotationLineItemRow).description || "—"}
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
                                {toNumber((row as QuotationLineItemRow).quantity)}
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
                                    (row as QuotationLineItemRow).unit_of_measure_id
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
                                        ? {
                                            ...entry,
                                            unit_price: event.target.value,
                                          }
                                        : entry
                                    )
                                  )
                                }
                                className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                              />
                            ) : (
                              <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                                {formatFinanceMoney(
                                  toNumber((row as QuotationLineItemRow).unit_price),
                                  printableCurrencyCode
                                )}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 md:col-span-1">
                            <div className="text-sm text-white/70">Discount</div>
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
                                className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                              />
                            ) : (
                              <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                                {toNumber(
                                  (row as QuotationLineItemRow).discount_rate
                                ).toFixed(2)}
                                %
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
                                    (row as QuotationLineItemRow).tax_code_id
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
                                    (row as QuotationLineItemRow).revenue_category_id
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
                <CardHeader className="border-b border-white/8 pb-4">
                  <CardTitle className="text-white">Financial Summary</CardTitle>
                  <CardDescription className="text-white/45">
                    Live quotation totals and document currency view.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Subtotal
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.subtotal,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Discount
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.discount,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Tax
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {formatFinanceMoney(
                        financialSummary?.tax,
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
                        financialSummary?.total,
                        printableCurrencyCode
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <CardHeader className="border-b border-white/8 pb-4">
                  <CardTitle className="text-white">Linked Client PO</CardTitle>
                  <CardDescription className="text-white/45">
                    Downstream client purchase order created from this quotation.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  {!linkedClientPO ? (
                    <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-4 text-sm text-white/45">
                      No linked client PO yet.
                    </div>
                  ) : (
                    <>
                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Client PO Number
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {linkedClientPO.client_po_number || "—"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          External PO Number
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {linkedClientPO.external_po_number || "—"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Status
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {linkedClientPO.status || "—"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                          Received At
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {formatFinanceDate(linkedClientPO.received_at)}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
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
                <div className="rounded-[20px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {showArchivePopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0f1a]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
              <div>
                <div className="text-lg font-semibold text-white">Archive</div>
                <div className="mt-1 text-sm text-white/45">
                  Archived and deleted quotations removed from the active registry.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowArchivePopup(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-white/8 px-6 py-4">
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
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
                  No {archiveTab} quotations found.
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleArchiveItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-4 rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-4 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-base font-semibold text-white">
                            {item.quotation_number || "Quotation"}
                          </div>

                          <Badge
                            className={`rounded-full border px-2.5 py-1 text-[11px] shadow-none ${getQuotationStatusBadgeClasses(
                              item.status
                            )}`}
                          >
                            {getQuotationStatusLabel(item.status as QuotationRecord["status"])}
                          </Badge>
                        </div>

                        <div className="mt-2 text-sm text-white/70">
                          {item.client_name_snapshot ||
                            item.company_name_snapshot ||
                            "—"}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-white/45 md:grid-cols-2">
                          <div>
                            Total:{" "}
                            {formatFinanceMoney(
                              item.total_amount,
                              printableCurrencyCode
                            )}
                          </div>
                          <div>
                            Updated: {formatFinanceDate(item.updated_at)}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/finance/transactions/quotations/${item.id}`)
                          }
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                        >
                          Open
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleRestore(item.id)}
                          className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20"
                        >
                          Restore
                        </button>

                        {archiveTab === "deleted" ? (
                          <button
                            type="button"
                            onClick={() => void handleHardDelete(item.id)}
                            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/20"
                          >
                            Hard Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
