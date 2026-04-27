"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

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

type ClientOption = {
  id: string;
  name: string;
  legal_name: string | null;
  company_email: string | null;
  personnel_email: string | null;
  company_phone: string | null;
  personnel_phone: string | null;
  currency_code: string | null;
  payment_terms_days: number | null;
  payment_terms_id: string | null;
};

type CompanyOption = {
  id: string;
  name: string;
  legal_name: string | null;
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

type ProjectOption = {
  id: string;
  name: string;
};

type TaskOption = {
  id: string;
  title: string;
  project_id: string | null;
};

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  is_base_currency: boolean;
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

type CustomerPoSource = {
  id: string;
  client_po_number: string | null;
  external_po_number: string | null;
  quotation_id: string | null;
  proforma_invoice_id: string | null;
  client_id: string | null;
  company_id: string | null;
  po_date: string | null;
  received_at: string | null;
  status: string;
  currency_id: string | null;
  currency_code: string | null;
  total_amount: number | string | null;
  notes: string | null;
  project_id: string | null;
  task_id: string | null;
};

type CustomerPoLineSource = {
  id: string;
  client_po_id: string;
  item_id: string | null;
  description: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  discount: number | string | null;
  sort_order: number | null;
  unit_of_measure_id: string | null;
  tax_code_id: string | null;
  revenue_category_id: string | null;
  project_id: string | null;
  task_id: string | null;
  status: string;
};

type ProformaItemRow = {
  localId: string;
  itemId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxCodeId: string;
  unitOfMeasureId: string;
  revenueCategoryId: string;
};

function createRow(): ProformaItemRow {
  return {
    localId: crypto.randomUUID(),
    itemId: "",
    description: "",
    quantity: "1",
    unitPrice: "0",
    discount: "0",
    taxCodeId: "",
    unitOfMeasureId: "",
    revenueCategoryId: "",
  };
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number, currencyCode = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function FinanceNewProformaInvoicePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceClientPoId = searchParams.get("client_po_id");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([]);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasureOption[]>(
    []
  );
  const [revenueCategories, setRevenueCategories] = useState<
    RevenueCategoryOption[]
  >([]);

  const [clientId, setClientId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");

  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [validUntil, setValidUntil] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ProformaItemRow[]>([createRow()]);
  const [errorMessage, setErrorMessage] = useState("");
  const [sourceCustomerPo, setSourceCustomerPo] =
    useState<CustomerPoSource | null>(null);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) ?? null,
    [clientId, clients]
  );

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === companyId) ?? null,
    [companies, companyId]
  );

  const filteredTasks = useMemo(() => {
    if (!projectId) {
      return tasks;
    }

    return tasks.filter((task) => task.project_id === projectId);
  }, [projectId, tasks]);

  const selectedCurrency = useMemo(
    () => currencies.find((currency) => currency.id === currencyId) ?? null,
    [currencies, currencyId]
  );

  useEffect(() => {
    if (!selectedClient) {
      return;
    }

    if (selectedClient.currency_code) {
      setCurrencyCode(selectedClient.currency_code);
      const matchedCurrency = currencies.find(
        (entry) => entry.currency_code === selectedClient.currency_code
      );
      if (matchedCurrency) {
        setCurrencyId(matchedCurrency.id);
      }
    }

    if (!validUntil) {
      const days = selectedClient.payment_terms_days ?? 14;
      const base = new Date(issueDate || new Date().toISOString().slice(0, 10));
      base.setDate(base.getDate() + days);
      setValidUntil(base.toISOString().slice(0, 10));
    }
  }, [currencies, issueDate, selectedClient, validUntil]);

  useEffect(() => {
    if (!companyId) return;

    if (!currencyId && selectedCompany?.currency_code) {
      const matchedCurrency = currencies.find(
        (entry) => entry.currency_code === selectedCompany.currency_code
      );
      if (matchedCurrency) {
        setCurrencyId(matchedCurrency.id);
        setCurrencyCode(matchedCurrency.currency_code);
      }
    }
  }, [companyId, currencies, currencyId, selectedCompany]);

  useEffect(() => {
    if (!projectId) {
      setTaskId("");
      return;
    }

    const matchingTaskStillValid = filteredTasks.some((task) => task.id === taskId);

    if (!matchingTaskStillValid) {
      setTaskId("");
    }
  }, [filteredTasks, projectId, taskId]);

  const loadFormData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

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
            "id, name, legal_name, company_email, personnel_email, company_phone, personnel_phone, currency_code, payment_terms_days, payment_terms_id"
          )
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_companies")
          .select(
            "id, name, legal_name, email, phone, currency_code, country, city, state_province, postal_code, address_line_1, address_line_2"
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
          .select("id, currency_code, currency_name, currency_symbol, is_base_currency")
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
      setProjects((projectsResult.data || []) as ProjectOption[]);
      setTasks((tasksResult.data || []) as TaskOption[]);
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
      setItems((itemsResult.data || []) as ItemOption[]);
      setTaxCodes((taxCodesResult.data || []) as TaxCodeOption[]);
      setUnitsOfMeasure((unitsOfMeasureResult.data || []) as UnitOfMeasureOption[]);
      setRevenueCategories(
        (revenueCategoriesResult.data || []) as RevenueCategoryOption[]
      );

      if (sourceClientPoId) {
        const { data: customerPoData, error: customerPoError } = await supabase
          .from("finance_client_purchase_orders")
          .select(
            "id, client_po_number, external_po_number, quotation_id, proforma_invoice_id, client_id, company_id, po_date, received_at, status, currency_id, currency_code, total_amount, notes, project_id, task_id"
          )
          .eq("id", sourceClientPoId)
          .maybeSingle();

        if (customerPoError) throw customerPoError;

        const typedCustomerPo = (customerPoData || null) as CustomerPoSource | null;

        if (!typedCustomerPo) {
          setErrorMessage("Customer PO source was not found.");
        } else if (typedCustomerPo.status !== "received") {
          setErrorMessage("Customer PO must be marked as received before creating a proforma invoice.");
        } else if (typedCustomerPo.proforma_invoice_id) {
          navigate(`/finance/transactions/proforma-invoices/${typedCustomerPo.proforma_invoice_id}`);
          return;
        } else {
          setSourceCustomerPo(typedCustomerPo);

          setClientId(typedCustomerPo.client_id || "");
          setCompanyId(typedCustomerPo.company_id || "");
          setProjectId(typedCustomerPo.project_id || "");
          setTaskId(typedCustomerPo.task_id || "");
          setCurrencyId(typedCustomerPo.currency_id || "");
          setCurrencyCode(typedCustomerPo.currency_code || "USD");
          setIssueDate(new Date().toISOString().slice(0, 10));

          const validUntilDate = new Date();
          validUntilDate.setDate(validUntilDate.getDate() + 30);
          setValidUntil(validUntilDate.toISOString().slice(0, 10));

          setNotes(
            [
              `Created from Customer PO: ${
                typedCustomerPo.client_po_number ||
                typedCustomerPo.external_po_number ||
                typedCustomerPo.id
              }`,
              typedCustomerPo.notes || "",
            ]
              .filter(Boolean)
              .join("\n")
          );

          const { data: customerPoLinesData, error: customerPoLinesError } =
            await supabase
              .from("finance_client_purchase_order_line_items")
              .select(
                "id, client_po_id, item_id, description, quantity, unit_price, discount, sort_order, unit_of_measure_id, tax_code_id, revenue_category_id, project_id, task_id, status"
              )
              .eq("client_po_id", typedCustomerPo.id)
              .eq("status", "active")
              .order("sort_order", { ascending: true });

          if (customerPoLinesError) throw customerPoLinesError;

          const customerPoLines = (customerPoLinesData || []) as CustomerPoLineSource[];

          if (customerPoLines.length > 0) {
            setRows(
              customerPoLines.map((line) => ({
                localId: crypto.randomUUID(),
                itemId: line.item_id || "",
                description: line.description || "",
                quantity: String(line.quantity ?? 1),
                unitPrice: String(line.unit_price ?? 0),
                discount: String(line.discount ?? 0),
                taxCodeId: line.tax_code_id || "",
                unitOfMeasureId: line.unit_of_measure_id || "",
                revenueCategoryId: line.revenue_category_id || "",
              }))
            );
          } else {
            setRows([
              {
                localId: crypto.randomUUID(),
                itemId: "",
                description: `Customer PO ${
                  typedCustomerPo.external_po_number ||
                  typedCustomerPo.client_po_number ||
                  ""
                }`.trim(),
                quantity: "1",
                unitPrice: String(Number(typedCustomerPo.total_amount || 0)),
                discount: "0",
                taxCodeId: "",
                unitOfMeasureId: "",
                revenueCategoryId: "",
              },
            ]);
          }
        }
      } else if (!companyId && (companiesResult.data || []).length === 1) {
        setCompanyId(companiesResult.data![0].id);
      }
    } catch (error) {
      console.error("Failed to load proforma invoice form data:", error);
      setErrorMessage("Failed to load proforma invoice form data.");
    } finally {
      setIsLoading(false);
    }
  }, [companyId, navigate, sourceClientPoId]);


  useEffect(() => {
    void loadFormData();
  }, [loadFormData]);

  const totals = useMemo(() => {
    const subtotal = rows.reduce(
      (sum, row) => sum + toNumber(row.quantity) * toNumber(row.unitPrice),
      0
    );

    const discount = rows.reduce((sum, row) => sum + toNumber(row.discount), 0);

    const tax = rows.reduce((sum, row) => {
      const base = Math.max(
        toNumber(row.quantity) * toNumber(row.unitPrice) - toNumber(row.discount),
        0
      );

      const taxCode = taxCodes.find((entry) => entry.id === row.taxCodeId);
      if (!taxCode) return sum;

      return sum + base * (Number(taxCode.rate_percent ?? 0) / 100);
    }, 0);

    const total = Math.max(subtotal - discount + tax, 0);

    return {
      subtotal,
      discount,
      tax,
      total,
    };
  }, [rows, taxCodes]);

  const updateRow = useCallback(
    (localId: string, field: keyof ProformaItemRow, value: string) => {
      setRows((current) =>
        current.map((row) =>
          row.localId === localId ? { ...row, [field]: value } : row
        )
      );
    },
    []
  );

  const applyItemToRow = useCallback(
    (localId: string, itemId: string) => {
      const selectedItem = items.find((item) => item.id === itemId);

      setRows((current) =>
        current.map((row) => {
          if (row.localId !== localId) return row;

          if (!selectedItem) {
            return {
              ...row,
              itemId: "",
            };
          }

          return {
            ...row,
            itemId: selectedItem.id,
            description: selectedItem.description || selectedItem.name,
            unitPrice: String(selectedItem.sales_price ?? 0),
            taxCodeId: selectedItem.tax_code_id || "",
            unitOfMeasureId: selectedItem.unit_of_measure_id || "",
            revenueCategoryId: selectedItem.revenue_category_id || "",
          };
        })
      );
    },
    [items]
  );

  const addRow = useCallback(() => {
    setRows((current) => {
      const last = current[current.length - 1];

      const isLastEmpty =
        !last.description.trim() &&
        toNumber(last.quantity) === 0 &&
        toNumber(last.unitPrice) === 0;

      if (isLastEmpty) {
        return current;
      }

      return [...current, createRow()];
    });
  }, []);

  const removeRow = useCallback((localId: string) => {
    setRows((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((row) => row.localId !== localId);
    });
  }, []);

  const handleSaveDraft = useCallback(async () => {
  setErrorMessage("");

  if (!clientId) {
    setErrorMessage("Select a client.");
    return;
  }

  if (!companyId) {
    setErrorMessage("Select an issuing company.");
    return;
  }

  const trimmedRows = rows.map((row) => ({
    ...row,
    description: row.description.trim(),
  }));

  const hasAtLeastOneValidRow = trimmedRows.some(
    (row) =>
      row.description &&
      toNumber(row.quantity) > 0 &&
      toNumber(row.unitPrice) >= 0
  );

  if (!hasAtLeastOneValidRow) {
    setErrorMessage("Add at least one valid line item.");
    return;
  }

  const hasInvalidRow = trimmedRows.some(
    (row) =>
      !row.description ||
      toNumber(row.quantity) <= 0 ||
      toNumber(row.unitPrice) < 0
  );

  if (hasInvalidRow) {
    setErrorMessage(
      "Every line item must have a description, quantity greater than 0, and unit price 0 or higher."
    );
    return;
  }

  const validRows = trimmedRows;

  setIsSaving(true);

  try {
    const { data, error } = await supabase.rpc(
      "finance_create_proforma_invoice",
      {
        p_client_id: clientId,
        p_issue_date: issueDate,
        p_valid_until: validUntil || null,
        p_currency_id: currencyId || null,
        p_project_id: projectId || null,
        p_task_id: taskId || null,
        p_notes: notes || null,
        p_metadata: {
          currency_code: currencyCode || "USD",
          issuing_company_id: companyId,
          creation_mode: sourceCustomerPo ? "customer_po_prefill" : "manual_draft",
          client_po_id: sourceCustomerPo?.id || null,
          client_po_number: sourceCustomerPo?.client_po_number || null,
          external_po_number: sourceCustomerPo?.external_po_number || null,
          quotation_id: sourceCustomerPo?.quotation_id || null,
        },
        p_lines: validRows.map((row) => ({
          item_id: row.itemId || null,
          description: row.description.trim(),
          quantity: toNumber(row.quantity),
          unit_price: toNumber(row.unitPrice),
          discount: toNumber(row.discount),
          tax_code_id: row.taxCodeId || null,
          unit_of_measure_id: row.unitOfMeasureId || null,
          revenue_category_id: row.revenueCategoryId || null,
        })),
      }
    );

    if (error) throw error;
    if (!data) {
      throw new Error("Proforma invoice was not created");
    }

    if (sourceCustomerPo) {
      const userId = await supabase.auth.getUser();

      const { error: proformaLinkError } = await supabase
        .from("finance_proforma_invoices")
        .update({
          company_id: companyId || null,
          quotation_id: sourceCustomerPo.quotation_id || null,
          client_po_id: sourceCustomerPo.id,
          currency_code: currencyCode || sourceCustomerPo.currency_code || "USD",
          updated_by: userId.data.user?.id || null,
        })
        .eq("id", data);

      if (proformaLinkError) throw proformaLinkError;

      const { error: customerPoLinkError } = await supabase
        .from("finance_client_purchase_orders")
        .update({
          proforma_invoice_id: data,
          status: "linked_to_pi",
          linked_to_pi_at: new Date().toISOString(),
          updated_by: userId.data.user?.id || null,
        })
        .eq("id", sourceCustomerPo.id);

      if (customerPoLinkError) throw customerPoLinkError;
    }

    navigate(`/finance/transactions/proforma-invoices/${data}`);
  } catch (error) {
    console.error("Failed to save proforma invoice draft:", error);
    setErrorMessage("Failed to save proforma invoice draft.");
  } finally {
    setIsSaving(false);
  }
}, [
  clientId,
  companyId,
  currencyCode,
  currencyId,
  issueDate,
  navigate,
  notes,
  projectId,
  rows,
  sourceCustomerPo,
  taskId,
  validUntil,
]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-8 pt-2 sm:px-6 xl:px-8">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6 xl:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_24%)]" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/70 shadow-none">
                    Receivables
                  </Badge>

                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    New proforma draft
                  </Badge>

                  {sourceCustomerPo ? (
                    <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                      From Customer PO {sourceCustomerPo.client_po_number || sourceCustomerPo.external_po_number}
                    </Badge>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Create Proforma Invoice Draft
                  </h1>
                  <div className="text-sm text-white/45">
                    Build a commercial pre-invoice draft from master data, then
                    send, accept, and convert it later from the proforma detail page.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 xl:justify-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate("/finance/transactions/proforma-invoices")
                  }
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <Button
                  variant="outline"
                  onClick={() => void loadFormData()}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Sources
                </Button>

                <Button
                  onClick={() => void handleSaveDraft()}
                  disabled={isSaving || isLoading}
                  className="h-11 rounded-2xl px-4"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
              </div>
            </div>
          </div>
        </section>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="text-white">Proforma Header</CardTitle>
                <CardDescription className="text-white/45">
                  Select the commercial and operational sources for the proforma invoice.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <label className="space-y-2">
                  <div className="text-sm text-white/70">Issuing Company</div>
                  <select
                    value={companyId}
                    onChange={(event) => setCompanyId(event.target.value)}
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
                    value={clientId}
                    onChange={(event) => setClientId(event.target.value)}
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
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
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
                    value={taskId}
                    onChange={(event) => setTaskId(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                  >
                    <option value="">No task</option>
                    {filteredTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className="text-sm text-white/70">Issue Date</div>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-sm text-white/70">Valid Until</div>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(event) => setValidUntil(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-sm text-white/70">Currency</div>
                  <select
                    value={currencyId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      setCurrencyId(nextId);
                      const matchedCurrency = currencies.find(
                        (entry) => entry.id === nextId
                      );
                      if (matchedCurrency) {
                        setCurrencyCode(matchedCurrency.currency_code);
                      }
                    }}
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

                <div className="space-y-2">
                  <div className="text-sm text-white/70">Client Email</div>
                  <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/70">
                    {selectedClient?.company_email ||
                      selectedClient?.personnel_email ||
                      "—"}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-white/70">Client Phone</div>
                  <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/70">
                    {selectedClient?.company_phone ||
                      selectedClient?.personnel_phone ||
                      "—"}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-white/70">Company Email</div>
                  <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/70">
                    {selectedCompany?.email || "—"}
                  </div>
                </div>

                <label className="space-y-2 md:col-span-2">
                  <div className="text-sm text-white/70">Notes</div>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                  />
                </label>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-white">Line Items</CardTitle>
                    <CardDescription className="text-white/45">
                      Add the commercial lines that will form the proforma invoice total.
                    </CardDescription>
                  </div>

                  <Button onClick={addRow} className="h-10 rounded-2xl px-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Row
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-5">
                {rows.map((row, index) => {
                  const rowBase = Math.max(
                    toNumber(row.quantity) * toNumber(row.unitPrice) -
                      toNumber(row.discount),
                    0
                  );

                  const rowTaxRate =
                    taxCodes.find((entry) => entry.id === row.taxCodeId)
                      ?.rate_percent ?? 0;

                  const rowTotal =
                    rowBase + rowBase * (Number(rowTaxRate) / 100);

                  return (
                    <div
                      key={row.localId}
                      className="rounded-[22px] border border-white/8 bg-black/15 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div className="text-sm font-medium text-white">
                          Line {index + 1}
                        </div>

                        <Button
                          variant="outline"
                          onClick={() => removeRow(row.localId)}
                          disabled={rows.length === 1}
                          className="h-9 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <label className="space-y-2 md:col-span-3">
                          <div className="text-sm text-white/70">Item</div>
                          <select
                            value={row.itemId}
                            onChange={(event) =>
                              applyItemToRow(row.localId, event.target.value)
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
                        </label>

                        <label className="space-y-2 md:col-span-4">
                          <div className="text-sm text-white/70">Description</div>
                          <input
                            value={row.description}
                            onChange={(event) =>
                              updateRow(
                                row.localId,
                                "description",
                                event.target.value
                              )
                            }
                            className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                          />
                        </label>

                        <label className="space-y-2 md:col-span-1">
                          <div className="text-sm text-white/70">Qty</div>
                          <input
                            value={row.quantity}
                            onChange={(event) =>
                              updateRow(row.localId, "quantity", event.target.value)
                            }
                            className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                          />
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className="text-sm text-white/70">Unit</div>
                          <select
                            value={row.unitOfMeasureId}
                            onChange={(event) =>
                              updateRow(
                                row.localId,
                                "unitOfMeasureId",
                                event.target.value
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
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className="text-sm text-white/70">Unit Price</div>
                          <input
                            value={row.unitPrice}
                            onChange={(event) =>
                              updateRow(row.localId, "unitPrice", event.target.value)
                            }
                            className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                          />
                        </label>

                                                <label className="space-y-2 md:col-span-1">
                          <div className="text-sm text-white/70">Discount</div>
                          <input
                            value={row.discount}
                            onChange={(event) =>
                              updateRow(row.localId, "discount", event.target.value)
                            }
                            className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                          />
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className="text-sm text-white/70">Tax Code</div>
                          <select
                            value={row.taxCodeId}
                            onChange={(event) =>
                              updateRow(row.localId, "taxCodeId", event.target.value)
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
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className="text-sm text-white/70">Revenue Category</div>
                          <select
                            value={row.revenueCategoryId}
                            onChange={(event) =>
                              updateRow(
                                row.localId,
                                "revenueCategoryId",
                                event.target.value
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
                        </label>

                        <div className="space-y-2 md:col-span-2">
                          <div className="text-sm text-white/70">Line Total</div>
                          <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                            {formatMoney(rowTotal, currencyCode)}
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
                <CardTitle className="text-white">Draft Summary</CardTitle>
                <CardDescription className="text-white/45">
                  Preview totals before saving the proforma invoice draft.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Issuing Company
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {selectedCompany?.legal_name || selectedCompany?.name || "—"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Client
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {selectedClient?.legal_name || selectedClient?.name || "—"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Currency
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {selectedCurrency
                      ? `${selectedCurrency.currency_code} — ${selectedCurrency.currency_name}`
                      : currencyCode || "—"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Issue Date
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {issueDate || "—"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Valid Until
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {validUntil || "—"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Subtotal
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatMoney(totals.subtotal, currencyCode)}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Discount
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatMoney(totals.discount, currencyCode)}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Tax
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatMoney(totals.tax, currencyCode)}
                  </div>
                </div>

                <div className="rounded-[20px] border border-cyan-400/15 bg-cyan-500/10 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                    Total
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {formatMoney(totals.total, currencyCode)}
                  </div>
                </div>

                {errorMessage ? (
                  <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {errorMessage}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="text-white">Locked Behavior</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 p-5 text-sm text-white/55">
                <div>• This page creates a draft only.</div>
                <div>• Proforma does not affect receivables directly.</div>
                <div>• Send, accept, and convert actions happen later from the detail page.</div>
                <div>• Master data supplies the source values.</div>
                <div>• Conversion to invoice is controlled and explicit.</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
            Loading proforma invoice sources...
          </div>
        ) : null}
      </div>
    </div>
  );
}
