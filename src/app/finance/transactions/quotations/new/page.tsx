"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
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

type PaymentTermOption = {
  id: string;
  code: string;
  name: string;
  due_days: number;
  is_default: boolean;
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
  beneficiary_name: string | null;
  iban: string | null;
  swift_code: string | null;
  currency_code: string | null;
  is_default: boolean;
  company_id: string | null;
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

type QuotationItemRow = {
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

function createRow(): QuotationItemRow {
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

export default function FinanceNewQuotationPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);

  const [paymentTerms, setPaymentTerms] = useState<PaymentTermOption[]>([]);
  const [shippingTerms, setShippingTerms] = useState<ShippingTermOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([]);

  const [clientId, setClientId] = useState("");
  const [counterpartyType, setCounterpartyType] = useState<"client" | "company">(
    "client"
  );
  const [counterpartyCompanyId, setCounterpartyCompanyId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");

  const [paymentTermsId, setPaymentTermsId] = useState("");
  const [shippingTermId, setShippingTermId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [currencyId, setCurrencyId] = useState("");

  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [validUntil, setValidUntil] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<QuotationItemRow[]>([createRow()]);
  const [errorMessage, setErrorMessage] = useState("");

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

  const filteredBankAccounts = useMemo(() => {
    if (!companyId) {
      return bankAccounts;
    }

    return bankAccounts.filter(
      (account) => !account.company_id || account.company_id === companyId
    );
  }, [bankAccounts, companyId]);

  const selectedPaymentTerm = useMemo(
    () => paymentTerms.find((term) => term.id === paymentTermsId) ?? null,
    [paymentTerms, paymentTermsId]
  );

  const selectedShippingTerm = useMemo(
    () => shippingTerms.find((term) => term.id === shippingTermId) ?? null,
    [shippingTerms, shippingTermId]
  );

  const selectedBankAccount = useMemo(
    () =>
      filteredBankAccounts.find((account) => account.id === bankAccountId) ??
      null,
    [bankAccountId, filteredBankAccounts]
  );

  const selectedCurrency = useMemo(
    () => currencies.find((currency) => currency.id === currencyId) ?? null,
    [currencies, currencyId]
  );

  useEffect(() => {
    if (counterpartyType === "client") {
      setCounterpartyCompanyId("");
    } else {
      setClientId("");
    }
  }, [counterpartyType]);

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

    if (selectedClient.payment_terms_id) {
      setPaymentTermsId(selectedClient.payment_terms_id);
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

    const defaultBank =
      filteredBankAccounts.find((account) => account.is_default) ??
      filteredBankAccounts[0];

    if (defaultBank) {
      setBankAccountId(defaultBank.id);
    }

    if (!currencyId && selectedCompany?.currency_code) {
      const matchedCurrency = currencies.find(
        (entry) => entry.currency_code === selectedCompany.currency_code
      );
      if (matchedCurrency) {
        setCurrencyId(matchedCurrency.id);
        setCurrencyCode(matchedCurrency.currency_code);
      }
    }
  }, [companyId, currencies, currencyId, filteredBankAccounts, selectedCompany]);

  useEffect(() => {
    if (shippingTermId) return;

    const defaultShippingTerm =
      shippingTerms.find((term) => term.is_default) ?? shippingTerms[0];

    if (defaultShippingTerm) {
      setShippingTermId(defaultShippingTerm.id);
    }
  }, [shippingTermId, shippingTerms]);

  useEffect(() => {
    if (paymentTermsId) return;

    const defaultPaymentTerm =
      paymentTerms.find((term) => term.is_default) ?? paymentTerms[0];

    if (defaultPaymentTerm) {
      setPaymentTermsId(defaultPaymentTerm.id);
    }
  }, [paymentTerms, paymentTermsId]);

  useEffect(() => {
    if (!projectId) {
      setTaskId("");
      return;
    }

    const matchingTaskStillValid = filteredTasks.some(
      (task) => task.id === taskId
    );

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
        paymentTermsResult,
        shippingTermsResult,
        bankAccountsResult,
        currenciesResult,
        itemsResult,
        taxCodesResult,
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
          .from("finance_payment_terms")
          .select("id, code, name, due_days, is_default")
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
            "id, name, bank_name, beneficiary_name, iban, swift_code, currency_code, is_default, company_id"
          )
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_currencies")
          .select(
            "id, currency_code, currency_name, currency_symbol, is_base_currency"
          )
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
      ]);

           if (clientsResult.error) throw clientsResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (tasksResult.error) throw tasksResult.error;
      if (paymentTermsResult.error) throw paymentTermsResult.error;
      if (shippingTermsResult.error) throw shippingTermsResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (itemsResult.error) throw itemsResult.error;
      if (taxCodesResult.error) throw taxCodesResult.error;

      setClients((clientsResult.data || []) as ClientOption[]);
      setCompanies((companiesResult.data || []) as CompanyOption[]);
      setProjects((projectsResult.data || []) as ProjectOption[]);
      setTasks((tasksResult.data || []) as TaskOption[]);

      setPaymentTerms((paymentTermsResult.data || []) as PaymentTermOption[]);
      setShippingTerms((shippingTermsResult.data || []) as ShippingTermOption[]);
      setBankAccounts((bankAccountsResult.data || []) as BankAccountOption[]);
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
      setItems((itemsResult.data || []) as ItemOption[]);
      setTaxCodes((taxCodesResult.data || []) as TaxCodeOption[]);

      if (!companyId && (companiesResult.data || []).length === 1) {
        setCompanyId(companiesResult.data![0].id);
      }
    } catch (error) {
      console.error("Failed to load quotation form data:", error);
      setErrorMessage("Failed to load quotation form data.");
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

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
    (localId: string, field: keyof QuotationItemRow, value: string) => {
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

    if (counterpartyType === "client" && !clientId) {
      setErrorMessage("Select a client.");
      return;
    }

    if (counterpartyType === "company" && !counterpartyCompanyId) {
      setErrorMessage("Select a receiving company.");
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

    setIsSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase.rpc("finance_create_quotation", {
        p_company_id: companyId,
        p_counterparty_type: counterpartyType,
        p_client_id: counterpartyType === "client" ? clientId : null,
        p_counterparty_company_id:
          counterpartyType === "company" ? counterpartyCompanyId : null,
        p_project_id: projectId || null,
        p_task_id: taskId || null,
        p_payment_terms_id: paymentTermsId || null,
        p_shipping_term_id: shippingTermId || null,
        p_bank_account_id: bankAccountId || null,
        p_currency_id: currencyId || null,
        p_issue_date: issueDate,
        p_valid_until: validUntil || null,
        p_notes: notes || null,
        p_currency_code: currencyCode || "USD",
        p_exchange_rate: 1,
        p_created_by: user.id,
        p_metadata: {
          creation_mode: "manual_draft",
        },
        p_lines: trimmedRows.map((row, index) => ({
          item_id: row.itemId || null,
          description: row.description.trim(),
          quantity: toNumber(row.quantity),
          unit_price: toNumber(row.unitPrice),
          discount: toNumber(row.discount),
          tax_code_id: row.taxCodeId || null,
          unit_of_measure_id: row.unitOfMeasureId || null,
          revenue_category_id: row.revenueCategoryId || null,
          sort_order: index + 1,
        })),
      });

      if (error) throw error;
      if (!data) {
        throw new Error("Quotation was not created");
      }

      navigate(`/finance/transactions/quotations/${data}`);
    } catch (error) {
      console.error("Failed to save quotation draft:", error);
      setErrorMessage("Failed to save quotation draft.");
    } finally {
      setIsSaving(false);
    }
  }, [
    bankAccountId,
    clientId,
    companyId,
    counterpartyCompanyId,
    counterpartyType,
    currencyCode,
    currencyId,
    issueDate,
    navigate,
    notes,
    paymentTermsId,
    projectId,
    rows,
    shippingTermId,
    taskId,
    validUntil,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-white/60">
        Loading quotation form...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/finance/transactions/quotations")}
            className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-white/70 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <div className="text-lg font-semibold text-white">
              New Quotation
            </div>
            <div className="text-xs text-white/40">
              Create a draft quotation document
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => loadFormData()}
            className="h-10 rounded-xl border-white/10 bg-white/5 px-4 text-white/70 hover:bg-white/10"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="h-10 rounded-xl bg-indigo-600 px-4 text-white hover:bg-indigo-500"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-12 gap-4">
        {/* LEFT COLUMN */}
        <div className="col-span-8 flex flex-col gap-4">
          {/* BASIC INFO */}
          <Card className="rounded-[24px] border border-white/10 bg-white/[0.04]">
            <CardHeader>
              <CardTitle className="text-white">Basic Information</CardTitle>
              <CardDescription>
                Define counterparties and document scope
              </CardDescription>
            </CardHeader>

            <CardContent className="grid grid-cols-2 gap-4">
              {/* Counterparty Type */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">
                  Counterparty Type
                </label>

                <select
                  value={counterpartyType}
                  onChange={(e) =>
                    setCounterpartyType(
                      e.target.value as "client" | "company"
                    )
                  }
                  className="h-10 rounded-xl bg-black/40 px-3 text-sm text-white border border-white/10"
                >
                  <option value="client">Client</option>
                  <option value="company">Company</option>
                </select>
              </div>

              {/* Client */}
              {counterpartyType === "client" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-white/50">Client</label>

                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="h-10 rounded-xl bg-black/40 px-3 text-sm text-white border border-white/10"
                  >
                    <option value="">Select client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Company Counterparty */}
              {counterpartyType === "company" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-white/50">
                    Receiving Company
                  </label>

                  <select
                    value={counterpartyCompanyId}
                    onChange={(e) =>
                      setCounterpartyCompanyId(e.target.value)
                    }
                    className="h-10 rounded-xl bg-black/40 px-3 text-sm text-white border border-white/10"
                  >
                    <option value="">Select company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Issuing Company */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">
                  Issuing Company
                </label>

                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="h-10 rounded-xl bg-black/40 px-3 text-sm text-white border border-white/10"
                >
                  <option value="">Select company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">Project</label>

                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="h-10 rounded-xl bg-black/40 px-3 text-sm text-white border border-white/10"
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">Task</label>

                <select
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                  className="h-10 rounded-xl bg-black/40 px-3 text-sm text-white border border-white/10"
                >
                  <option value="">None</option>
                  {filteredTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

                    {/* FINANCIAL SETTINGS */}
          <Card className="rounded-[24px] border border-white/10 bg-white/[0.04]">
            <CardHeader>
              <CardTitle className="text-white">
                Financial Settings
              </CardTitle>
              <CardDescription>
                Payment terms, currency and logistics
              </CardDescription>
            </CardHeader>

            <CardContent className="grid grid-cols-2 gap-4">
              {/* Currency */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">Currency</label>

                <select
                  value={currencyId}
                  onChange={(e) => setCurrencyId(e.target.value)}
                  className="h-10 rounded-xl bg-black/40 px-3 text-sm text-white border border-white/10"
                >
                  <option value="">Select currency</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.currency_code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bank */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">
                  Bank Account
                </label>

                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="h-10 rounded-xl bg-black/40 px-3 text-sm text-white border border-white/10"
                >
                  <option value="">Select bank</option>
                  {filteredBankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Terms */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">
                  Payment Terms
                </label>

                <select
                  value={paymentTermsId}
                  onChange={(e) => setPaymentTermsId(e.target.value)}
                  className="h-10 rounded-xl bg-black/40 px-3 text-sm text-white border border-white/10"
                >
                  <option value="">Select terms</option>
                  {paymentTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shipping Terms */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">
                  Shipping Terms
                </label>

                <select
                  value={shippingTermId}
                  onChange={(e) => setShippingTermId(e.target.value)}
                  className="h-10 rounded-xl bg-black/40 px-3 text-sm text-white border border-white/10"
                >
                  <option value="">Select shipping</option>
                  {shippingTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* DATES */}
          <Card className="rounded-[24px] border border-white/10 bg-white/[0.04]">
            <CardHeader>
              <CardTitle className="text-white">Dates</CardTitle>
              <CardDescription>
                Issue and validity timeline
              </CardDescription>
            </CardHeader>

            <CardContent className="grid grid-cols-2 gap-4">
              {/* Issue Date */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">
                  Issue Date
                </label>

                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="h-10 rounded-xl bg-black/40 px-3 text-sm text-white border border-white/10"
                />
              </div>

              {/* Valid Until */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">
                  Valid Until
                </label>

                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="h-10 rounded-xl bg-black/40 px-3 text-sm text-white border border-white/10"
                />
              </div>
            </CardContent>
          </Card>


                    {/* LINE ITEMS */}
          <Card className="rounded-[24px] border border-white/10 bg-white/[0.04]">
            <CardHeader>
              <CardTitle className="text-white">Line Items</CardTitle>
              <CardDescription>
                Define products / services in this quotation
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {/* TABLE HEADER */}
              <div className="grid grid-cols-12 gap-2 text-[11px] uppercase tracking-wider text-white/40 px-2">
                <div className="col-span-3">Item</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-1">Qty</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-1">Discount</div>
                <div className="col-span-1">Tax</div>
                <div className="col-span-1"></div>
              </div>

              {/* ROWS */}
              <div className="flex flex-col gap-2">
                {rows.map((row) => (
                  <div
                    key={row.localId}
                    className="grid grid-cols-12 gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-2"
                  >
                    {/* ITEM SELECT */}
                    <select
                      value={row.itemId}
                      onChange={(e) =>
                        applyItemToRow(row.localId, e.target.value)
                      }
                      className="col-span-3 h-10 rounded-lg bg-black/40 px-2 text-sm text-white border border-white/10"
                    >
                      <option value="">Select item</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>

                    {/* DESCRIPTION */}
                    <input
                      value={row.description}
                      onChange={(e) =>
                        updateRow(
                          row.localId,
                          "description",
                          e.target.value
                        )
                      }
                      placeholder="Description"
                      className="col-span-3 h-10 rounded-lg bg-black/40 px-2 text-sm text-white border border-white/10"
                    />

                    {/* QUANTITY */}
                    <input
                      value={row.quantity}
                      onChange={(e) =>
                        updateRow(row.localId, "quantity", e.target.value)
                      }
                      className="col-span-1 h-10 rounded-lg bg-black/40 px-2 text-sm text-white border border-white/10"
                    />

                    {/* UNIT PRICE */}
                    <input
                      value={row.unitPrice}
                      onChange={(e) =>
                        updateRow(row.localId, "unitPrice", e.target.value)
                      }
                      className="col-span-2 h-10 rounded-lg bg-black/40 px-2 text-sm text-white border border-white/10"
                    />

                    {/* DISCOUNT */}
                    <input
                      value={row.discount}
                      onChange={(e) =>
                        updateRow(row.localId, "discount", e.target.value)
                      }
                      className="col-span-1 h-10 rounded-lg bg-black/40 px-2 text-sm text-white border border-white/10"
                    />

                    {/* TAX */}
                    <select
                      value={row.taxCodeId}
                      onChange={(e) =>
                        updateRow(row.localId, "taxCodeId", e.target.value)
                      }
                      className="col-span-1 h-10 rounded-lg bg-black/40 px-2 text-sm text-white border border-white/10"
                    >
                      <option value="">Tax</option>
                      {taxCodes.map((tax) => (
                        <option key={tax.id} value={tax.id}>
                          {tax.name}
                        </option>
                      ))}
                    </select>

                    {/* REMOVE */}
                    <div className="col-span-1 flex items-center justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeRow(row.localId)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ADD ROW */}
              <div>
                <Button
                  variant="outline"
                  onClick={addRow}
                  className="rounded-xl border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </div>
            </CardContent>
          </Card>

                    {/* NOTES */}
          <Card className="rounded-[24px] border border-white/10 bg-white/[0.04]">
            <CardHeader>
              <CardTitle className="text-white">Notes</CardTitle>
              <CardDescription>
                Internal or document notes for this quotation draft
              </CardDescription>
            </CardHeader>

            <CardContent>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
                rows={5}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-4 flex flex-col gap-4">
          <Card className="rounded-[24px] border border-white/10 bg-white/[0.04]">
            <CardHeader>
              <CardTitle className="text-white">Quotation Summary</CardTitle>
              <CardDescription>
                Live commercial summary before saving
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="text-[11px] uppercase tracking-wider text-white/40">
                  Counterparty
                </div>
                <div className="mt-1 text-sm font-medium text-white">
                  {counterpartyType === "client"
                    ? selectedClient?.legal_name || selectedClient?.name || "—"
                    : companies.find((c) => c.id === counterpartyCompanyId)
                        ?.legal_name ||
                      companies.find((c) => c.id === counterpartyCompanyId)?.name ||
                      "—"}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="text-[11px] uppercase tracking-wider text-white/40">
                  Issuing Company
                </div>
                <div className="mt-1 text-sm font-medium text-white">
                  {selectedCompany?.legal_name || selectedCompany?.name || "—"}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="text-[11px] uppercase tracking-wider text-white/40">
                  Payment Terms
                </div>
                <div className="mt-1 text-sm font-medium text-white">
                  {selectedPaymentTerm?.name || "—"}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="text-[11px] uppercase tracking-wider text-white/40">
                  Shipping Terms
                </div>
                <div className="mt-1 text-sm font-medium text-white">
                  {selectedShippingTerm?.name || "—"}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="text-[11px] uppercase tracking-wider text-white/40">
                  Bank Account
                </div>
                <div className="mt-1 text-sm font-medium text-white">
                  {selectedBankAccount?.name || "—"}
                </div>
                <div className="mt-1 text-xs text-white/45">
                  {selectedBankAccount?.bank_name || ""}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="text-[11px] uppercase tracking-wider text-white/40">
                  Currency
                </div>
                <div className="mt-1 text-sm font-medium text-white">
                  {selectedCurrency
                    ? `${selectedCurrency.currency_code} — ${selectedCurrency.currency_name}`
                    : currencyCode || "—"}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Subtotal</span>
                  <span className="font-medium text-white">
                    {formatMoney(totals.subtotal, currencyCode)}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-white/50">Discount</span>
                  <span className="font-medium text-white">
                    {formatMoney(totals.discount, currencyCode)}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-white/50">Tax</span>
                  <span className="font-medium text-white">
                    {formatMoney(totals.tax, currencyCode)}
                  </span>
                </div>

                <div className="mt-3 border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/70">
                      Total
                    </span>
                    <span className="text-lg font-semibold text-white">
                      {formatMoney(totals.total, currencyCode)}
                    </span>
                  </div>
                </div>
              </div>

              {errorMessage ? (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
                  {errorMessage}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border border-white/10 bg-white/[0.04]">
            <CardHeader>
              <CardTitle className="text-white">Locked Behavior</CardTitle>
            </CardHeader>

            <CardContent className="space-y-2 text-sm text-white/55">
              <div>• This page creates a quotation draft only.</div>
              <div>• Send / accept / reject / archive happen later.</div>
              <div>• Client PO conversion happens only after approval of the flow.</div>
              <div>• Master data is the source of truth for contacts and finance data.</div>
              <div>• Snapshot logic is preserved in backend creation flow.</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
          Loading quotation sources...
        </div>
      ) : null}
    </div>
  );
}
