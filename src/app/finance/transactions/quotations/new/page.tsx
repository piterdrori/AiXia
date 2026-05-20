"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  FileText,
  Plus,
  Save,
  SquarePen,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  AixiaAlert,
  AixiaBadge,
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
  AixiaCommandMetrics,
  type AixiaCommandMetricItem,
  FinancePage,
  AixiaReviewBlock,
  AixiaReviewGrid,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaTextareaField,
} from "@/components/aixia";

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
  bank_name: string | null;
  institution_name: string | null;
  beneficiary_name: string | null;
  iban: string | null;
  swift_code: string | null;
  account_identifier_type: string | null;
  account_identifier_value: string | null;
  account_number: string | null;
  masked_account_number: string | null;
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

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
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

function getCompanyAddress(company: CompanyOption | null) {
  if (!company) return "—";

  return (
    [
      company.address_line_1,
      company.address_line_2,
      company.city,
      company.state_province,
      company.postal_code,
      company.country,
    ]
      .filter(Boolean)
      .join(", ") || "—"
  );
}

function getBankAccountName(bank: BankAccountOption | null) {
  if (!bank) return "—";

  return bank.bank_name || bank.institution_name || "Bank account";
}

function getBankIdentifier(bank: BankAccountOption | null) {
  if (!bank) return "—";
  if (bank.iban) return `IBAN ${bank.iban}`;
  if (bank.swift_code) return `SWIFT ${bank.swift_code}`;

  if (bank.account_identifier_type === "swift" && bank.account_identifier_value) {
    return `SWIFT ${bank.account_identifier_value}`;
  }

  if (bank.account_identifier_value) {
    return `Identifier ${bank.account_identifier_value}`;
  }

  if (bank.masked_account_number) return bank.masked_account_number;
  if (bank.account_number) return bank.account_number;

  return "No identifier";
}

function getClientName(client: ClientOption | null) {
  if (!client) return "—";
  return client.legal_name || client.name;
}

function getCompanyName(company: CompanyOption | null) {
  if (!company) return "—";
  return company.legal_name || company.name;
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
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasureOption[]>(
    []
  );
  const [revenueCategories, setRevenueCategories] = useState<
    RevenueCategoryOption[]
  >([]);

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

  const selectedCounterpartyCompany = useMemo(
    () =>
      companies.find((company) => company.id === counterpartyCompanyId) ?? null,
    [companies, counterpartyCompanyId]
  );

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === companyId) ?? null,
    [companies, companyId]
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projectId, projects]
  );

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === taskId) ?? null,
    [taskId, tasks]
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
    type LookupResult = {
      data: unknown[];
      error: string;
    };

    async function loadLookup(
      label: string,
      query: PromiseLike<{
        data: unknown[] | null;
        error: { message?: string } | null;
      }>
    ): Promise<LookupResult> {
      try {
        const result = await query;

        if (result.error) {
          const message = result.error.message || `${label} failed to load.`;
          console.error(`${label} lookup failed:`, result.error);

          return {
            data: [],
            error: `${label}: ${message}`,
          };
        }

        return {
          data: result.data || [],
          error: "",
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : `${label} failed to load.`;

        console.error(`${label} lookup failed:`, error);

        return {
          data: [],
          error: `${label}: ${message}`,
        };
      }
    }

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
        unitsOfMeasureResult,
        revenueCategoriesResult,
      ] = await Promise.all([
        loadLookup(
          "Clients",
          supabase
            .from("finance_clients")
            .select(
              "id, name, legal_name, company_email, personnel_email, company_phone, personnel_phone, currency_code, payment_terms_days, payment_terms_id"
            )
            .eq("status", "active")
            .order("name", { ascending: true })
        ),

        loadLookup(
          "Companies",
          supabase
            .from("finance_companies")
            .select(
              "id, name, legal_name, email, phone, currency_code, country, city, state_province, postal_code, address_line_1, address_line_2"
            )
            .eq("status", "active")
            .order("name", { ascending: true })
        ),

        loadLookup(
          "Projects",
          supabase.from("projects").select("id, name").order("name", {
            ascending: true,
          })
        ),

        loadLookup(
          "Tasks",
          supabase
            .from("tasks")
            .select("id, title, project_id")
            .order("created_at", { ascending: false })
        ),

        loadLookup(
          "Payment terms",
          supabase
            .from("finance_payment_terms")
            .select("id, code, name, due_days, is_default")
            .eq("status", "active")
            .order("name", { ascending: true })
        ),

        loadLookup(
          "Shipping terms",
          supabase
            .from("finance_shipping_terms")
            .select("id, code, name, description, is_default")
            .eq("status", "active")
            .order("name", { ascending: true })
        ),

        loadLookup(
          "Bank accounts",
          supabase
            .from("finance_bank_accounts")
            .select(
              "id, bank_name, institution_name, beneficiary_name, iban, swift_code, account_identifier_type, account_identifier_value, account_number, masked_account_number, currency_code, is_default, company_id"
            )
            .eq("status", "active")
            .order("is_default", { ascending: false })
            .order("bank_name", { ascending: true })
        ),

        loadLookup(
          "Currencies",
          supabase
            .from("finance_currencies")
            .select(
              "id, currency_code, currency_name, currency_symbol, is_base_currency"
            )
            .eq("status", "active")
            .order("currency_code", { ascending: true })
        ),

        loadLookup(
          "Items",
          supabase
            .from("finance_items")
            .select(
              "id, name, description, sales_price, currency_code, revenue_category_id, tax_code_id, unit_of_measure_id"
            )
            .eq("status", "active")
            .eq("is_active_for_sales", true)
            .order("name", { ascending: true })
        ),

        loadLookup(
          "Tax codes",
          supabase
            .from("finance_tax_codes")
            .select("id, code, name, rate_percent")
            .eq("status", "active")
            .order("name", { ascending: true })
        ),

        loadLookup(
          "Units of measure",
          supabase
            .from("finance_units_of_measure")
            .select("id, code, name")
            .eq("status", "active")
            .order("name", { ascending: true })
        ),

        loadLookup(
          "Revenue categories",
          supabase
            .from("finance_revenue_categories")
            .select("id, code, name")
            .eq("status", "active")
            .order("name", { ascending: true })
        ),
      ]);

      setClients(clientsResult.data as ClientOption[]);
      setCompanies(companiesResult.data as CompanyOption[]);
      setProjects(projectsResult.data as ProjectOption[]);
      setTasks(tasksResult.data as TaskOption[]);
      setPaymentTerms(paymentTermsResult.data as PaymentTermOption[]);
      setShippingTerms(shippingTermsResult.data as ShippingTermOption[]);
      setBankAccounts(bankAccountsResult.data as BankAccountOption[]);
      setCurrencies(currenciesResult.data as CurrencyOption[]);
      setItems(itemsResult.data as ItemOption[]);
      setTaxCodes(taxCodesResult.data as TaxCodeOption[]);
      setUnitsOfMeasure(unitsOfMeasureResult.data as UnitOfMeasureOption[]);
      setRevenueCategories(
        revenueCategoriesResult.data as RevenueCategoryOption[]
      );

      if (!companyId && companiesResult.data.length === 1) {
        const onlyCompany = companiesResult.data[0] as CompanyOption;
        setCompanyId(onlyCompany.id);
      }

      const lookupErrors = [
        clientsResult.error,
        companiesResult.error,
        projectsResult.error,
        tasksResult.error,
        paymentTermsResult.error,
        shippingTermsResult.error,
        bankAccountsResult.error,
        currenciesResult.error,
        itemsResult.error,
        taxCodesResult.error,
        unitsOfMeasureResult.error,
        revenueCategoriesResult.error,
      ].filter(Boolean);

      if (lookupErrors.length > 0) {
        setErrorMessage(lookupErrors.join(" | "));
      }
    } catch (error) {
      console.error("Failed to load quotation form data:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load quotation form data."
      );
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

  const draftMetrics = useMemo<AixiaCommandMetricItem[]>(
    () => [
      {
        key: "subtotal",
        title: "Subtotal",
        value: formatMoney(totals.subtotal, currencyCode),
        subtitle: "Before discount and tax.",
        icon: FileText,
        tone: "cyan",
      },
      {
        key: "discount",
        title: "Discount",
        value: formatMoney(totals.discount, currencyCode),
        subtitle: "Draft commercial discount.",
        icon: Wallet,
        tone: "amber",
      },
      {
        key: "tax",
        title: "Tax",
        value: formatMoney(totals.tax, currencyCode),
        subtitle: "Based on selected tax codes.",
        icon: CalendarDays,
        tone: "violet",
      },
      {
        key: "total",
        title: "Total",
        value: formatMoney(totals.total, currencyCode),
        subtitle: "Draft quotation value.",
        icon: Wallet,
        tone: "emerald",
      },
    ],
    [totals, currencyCode]
  );

  if (isLoading) {
    return (
      <FinancePage>
        <AixiaLoadingState title="Loading quotation sources" />
      </FinancePage>
    );
  }

  const counterpartyName =
    counterpartyType === "client"
      ? getClientName(selectedClient)
      : getCompanyName(selectedCounterpartyCompany);

  return (
    <FinancePage>
      <AixiaHero
        surface="command"
        className="shrink-0 space-y-4"
        parentLabel="Quotations"
        parentPath="/finance/transactions/quotations"
        gradientTitle="Quotations"
        title="Quotations"
        subtitle={`Draft quotation for ${counterpartyName || "selected counterparty"}`}
        actions={
          <AixiaButton
            variant="primary"
            onClick={handleSaveDraft}
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Draft"}
          </AixiaButton>
        }
      >
        <AixiaCommandMetrics items={draftMetrics} />
      </AixiaHero>

      <div className="aixia-command-scroll">
      {errorMessage ? <AixiaAlert tone="error">{errorMessage}</AixiaAlert> : null}

      <AixiaSmartLayout
        main={
          <>
            <AixiaSection
              title="Document Overview"
              description="Counterparty, issuing company, project references, dates, and currency."
              icon={SquarePen}
            >
              <AixiaFormGrid columns="three">
                <AixiaFormField>
                  <AixiaFieldLabel label="Counterparty Type" />
                  <AixiaSelectField
                    value={counterpartyType}
                    onChange={(event) =>
                      setCounterpartyType(
                        event.target.value as "client" | "company"
                      )
                    }
                  >
                    <option value="client">Client</option>
                    <option value="company">Company</option>
                  </AixiaSelectField>
                </AixiaFormField>

                {counterpartyType === "client" ? (
                  <AixiaFormField>
                    <AixiaFieldLabel label="Client" required />
                    <AixiaSelectField
                      value={clientId}
                      onChange={(event) => setClientId(event.target.value)}
                    >
                      <option value="">Select client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.legal_name || client.name}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormField>
                ) : (
                  <AixiaFormField>
                    <AixiaFieldLabel label="Receiving Company" required />
                    <AixiaSelectField
                      value={counterpartyCompanyId}
                      onChange={(event) =>
                        setCounterpartyCompanyId(event.target.value)
                      }
                    >
                      <option value="">Select company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.legal_name || company.name}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormField>
                )}

                <AixiaFormField>
                  <AixiaFieldLabel label="Issuing Company" required />
                  <AixiaSelectField
                    value={companyId}
                    onChange={(event) => setCompanyId(event.target.value)}
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
                  <AixiaFieldLabel label="Project" />
                  <AixiaSelectField
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
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
                    value={taskId}
                    onChange={(event) => setTaskId(event.target.value)}
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
                  <AixiaFieldLabel label="Currency" />
                  <AixiaSelectField
                    value={currencyId}
                    onChange={(event) => {
                      setCurrencyId(event.target.value);
                      const nextCurrency = currencies.find(
                        (currency) => currency.id === event.target.value
                      );
                      if (nextCurrency) {
                        setCurrencyCode(nextCurrency.currency_code);
                      }
                    }}
                  >
                    <option value="">Select currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.currency_code} — {currency.currency_name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Issue Date" />
                  <AixiaInputField
                    type="date"
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Valid Until" />
                  <AixiaInputField
                    type="date"
                    value={validUntil}
                    onChange={(event) => setValidUntil(event.target.value)}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Draft Status" />
                  <AixiaBadge tone="neutral">Draft</AixiaBadge>
                </AixiaFormField>
              </AixiaFormGrid>
            </AixiaSection>

            <AixiaSection
              title="Financial Settings"
              description="Payment terms, shipping terms, bank account, and financial defaults."
              icon={Wallet}
            >
              <AixiaFormGrid columns="two">
                <AixiaFormField>
                  <AixiaFieldLabel label="Payment Terms" />
                  <AixiaSelectField
                    value={paymentTermsId}
                    onChange={(event) => setPaymentTermsId(event.target.value)}
                  >
                    <option value="">Select terms</option>
                    {paymentTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Shipping Terms" />
                  <AixiaSelectField
                    value={shippingTermId}
                    onChange={(event) => setShippingTermId(event.target.value)}
                  >
                    <option value="">Select shipping</option>
                    {shippingTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Bank Account" />
                  <AixiaSelectField
                    value={bankAccountId}
                    onChange={(event) => setBankAccountId(event.target.value)}
                  >
                    <option value="">Select bank</option>
                    {filteredBankAccounts.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {getBankAccountName(bank)} — {getBankIdentifier(bank)}
                        {bank.currency_code ? ` — ${bank.currency_code}` : ""}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaDisplayBlock
                  label="Bank Details"
                  value={getBankAccountName(selectedBankAccount)}
                  detail={
                    selectedBankAccount ? (
                      <>
                        {selectedBankAccount.beneficiary_name ? (
                          <div>Beneficiary: {selectedBankAccount.beneficiary_name}</div>
                        ) : null}
                        <div>{getBankIdentifier(selectedBankAccount)}</div>
                        {selectedBankAccount.currency_code ? (
                          <div>Currency: {selectedBankAccount.currency_code}</div>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )
                  }
                />
              </AixiaFormGrid>
            </AixiaSection>

            <AixiaSection
              title="Line Items"
              description="Add products or services using the locked quotation line-item card pattern."
              icon={SquarePen}
              actions={
                <AixiaButton variant="secondary" onClick={addRow}>
                  <Plus className="h-4 w-4" />
                  Add Row
                </AixiaButton>
              }
            >
              {rows.length > 0 ? (
                <div className="aixia-form-row-card-list">
                  {rows.map((row, index) => {
                    const selectedItem = items.find(
                      (item) => item.id === row.itemId
                    );
                    const selectedTaxCode = taxCodes.find(
                      (taxCode) => taxCode.id === row.taxCodeId
                    );
                    const selectedUnit = unitsOfMeasure.find(
                      (unit) => unit.id === row.unitOfMeasureId
                    );
                    const selectedRevenueCategory = revenueCategories.find(
                      (category) => category.id === row.revenueCategoryId
                    );
                    const base =
                      toNumber(row.quantity) * toNumber(row.unitPrice);
                    const taxableBase = Math.max(
                      base - toNumber(row.discount),
                      0
                    );
                    const taxAmount =
                      taxableBase *
                      (Number(selectedTaxCode?.rate_percent ?? 0) / 100);
                    const rowTotal = taxableBase + taxAmount;

                    return (
                      <AixiaFormRowCard
                        key={row.localId}
                        title={`Line ${index + 1}`}
                        description={
                          selectedItem?.name || selectedRevenueCategory?.name || undefined
                        }
                        onRemove={() => removeRow(row.localId)}
                        removeDisabled={rows.length === 1}
                        removeLabel={
                          <>
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </>
                        }
                      >
                        <AixiaFormGrid columns="three">
                          <AixiaFormField>
                            <AixiaFieldLabel label="Item" />
                            <AixiaSelectField
                              value={row.itemId}
                              onChange={(event) =>
                                applyItemToRow(row.localId, event.target.value)
                              }
                            >
                              <option value="">Select item</option>
                              {items.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </AixiaSelectField>
                          </AixiaFormField>

                          <AixiaFormFullWidth>
                            <AixiaFieldLabel label="Description" required />
                            <AixiaInputField
                              value={row.description}
                              onChange={(event) =>
                                updateRow(
                                  row.localId,
                                  "description",
                                  event.target.value
                                )
                              }
                              placeholder="Description"
                            />
                          </AixiaFormFullWidth>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Qty" required />
                            <AixiaInputField
                              value={row.quantity}
                              onChange={(event) =>
                                updateRow(
                                  row.localId,
                                  "quantity",
                                  event.target.value
                                )
                              }
                            />
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel
                              label="Unit"
                              helper={selectedUnit?.code || undefined}
                            />
                            <AixiaSelectField
                              value={row.unitOfMeasureId}
                              onChange={(event) =>
                                updateRow(
                                  row.localId,
                                  "unitOfMeasureId",
                                  event.target.value
                                )
                              }
                            >
                              <option value="">Select unit</option>
                              {unitsOfMeasure.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                  {unit.name}
                                </option>
                              ))}
                            </AixiaSelectField>
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Unit Price" required />
                            <AixiaInputField
                              value={row.unitPrice}
                              onChange={(event) =>
                                updateRow(
                                  row.localId,
                                  "unitPrice",
                                  event.target.value
                                )
                              }
                            />
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Discount" />
                            <AixiaInputField
                              value={row.discount}
                              onChange={(event) =>
                                updateRow(
                                  row.localId,
                                  "discount",
                                  event.target.value
                                )
                              }
                            />
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Tax Code" />
                            <AixiaSelectField
                              value={row.taxCodeId}
                              onChange={(event) =>
                                updateRow(
                                  row.localId,
                                  "taxCodeId",
                                  event.target.value
                                )
                              }
                            >
                              <option value="">Select tax</option>
                              {taxCodes.map((tax) => (
                                <option key={tax.id} value={tax.id}>
                                  {tax.name}
                                </option>
                              ))}
                            </AixiaSelectField>
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel
                              label="Revenue Category"
                              helper={selectedRevenueCategory?.code || undefined}
                            />
                            <AixiaSelectField
                              value={row.revenueCategoryId}
                              onChange={(event) =>
                                updateRow(
                                  row.localId,
                                  "revenueCategoryId",
                                  event.target.value
                                )
                              }
                            >
                              <option value="">Select category</option>
                              {revenueCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </AixiaSelectField>
                          </AixiaFormField>

                          <AixiaDisplayBlock
                            label="Line Total"
                            value={formatMoney(rowTotal, currencyCode)}
                          />
                        </AixiaFormGrid>
                      </AixiaFormRowCard>
                    );
                  })}
                </div>
              ) : (
                <AixiaEmptyState
                  icon={FileText}
                  title="No line items"
                  description="Add at least one quotation line before saving."
                />
              )}
            </AixiaSection>

            <AixiaSection
              title="Notes"
              description="Internal or document notes for this quotation draft."
              icon={FileText}
            >
              <AixiaTextareaField
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add notes..."
                rows={5}
              />
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Quotation Summary"
              description="Live commercial summary before saving."
              icon={Wallet}
            >
              <AixiaReviewGrid variant="stack">
                <AixiaReviewBlock
                  label="Counterparty"
                  value={counterpartyName}
                  icon={Users}
                  tone="cyan"
                />
                <AixiaReviewBlock
                  label="Issuing Company"
                  value={getCompanyName(selectedCompany)}
                  description={getCompanyAddress(selectedCompany)}
                  icon={Building2}
                  tone="violet"
                />
                <AixiaReviewBlock
                  label="Payment Terms"
                  value={selectedPaymentTerm?.name || "—"}
                  tone="neutral"
                />
                <AixiaReviewBlock
                  label="Shipping Terms"
                  value={selectedShippingTerm?.name || "—"}
                  tone="neutral"
                />
                <AixiaReviewBlock
                  label="Bank Account"
                  value={getBankAccountName(selectedBankAccount)}
                  description={getBankIdentifier(selectedBankAccount)}
                  tone="amber"
                />
                <AixiaReviewBlock
                  label="Currency"
                  value={
                    selectedCurrency
                      ? `${selectedCurrency.currency_code} — ${selectedCurrency.currency_name}`
                      : currencyCode || "—"
                  }
                  tone="emerald"
                />
                <AixiaReviewBlock
                  label="Project / Task"
                  value={
                    [selectedProject?.name, selectedTask?.title]
                      .filter(Boolean)
                      .join(" / ") || "—"
                  }
                  tone="neutral"
                />
                <AixiaReviewBlock
                  label="Total"
                  value={formatMoney(totals.total, currencyCode)}
                  description={`Subtotal ${formatMoney(
                    totals.subtotal,
                    currencyCode
                  )} · Tax ${formatMoney(totals.tax, currencyCode)}`}
                  icon={Wallet}
                  tone="emerald"
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Locked Behavior"
              description="New quotation creation rules."
              icon={FileText}
            >
              <AixiaReviewGrid variant="stack">
                <AixiaReviewBlock
                  label="Draft only"
                  value="This page creates a quotation draft only."
                  tone="cyan"
                />
                <AixiaReviewBlock
                  label="Workflow actions"
                  value="Send, accept, reject, archive, and delete happen later."
                  tone="neutral"
                />
                <AixiaReviewBlock
                  label="Conversion"
                  value="Client PO conversion happens only after the quotation workflow."
                  tone="violet"
                />
                <AixiaReviewBlock
                  label="Source of truth"
                  value="Master data remains the source of truth."
                  tone="emerald"
                />
                <AixiaReviewBlock
                  label="Backend snapshots"
                  value="Snapshot logic is preserved in the backend creation flow."
                  tone="amber"
                />
              </AixiaReviewGrid>
            </AixiaSection>
          </>
        }
      />
      </div>
    </FinancePage>
  );
}
