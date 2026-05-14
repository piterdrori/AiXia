"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  Plus,
  Save,
  ShieldCheck,
  SquarePen,
  Trash2,
  Wallet,
} from "lucide-react";

import {
  AixiaAccessRule,
  AixiaAlert,
  AixiaBadge,
  AixiaButton,
  AixiaDisplayBlock,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";
import { supabase } from "@/lib/supabase";

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
  institution_name: string | null;
  beneficiary_name: string | null;
  iban: string | null;
  swift_code: string | null;
  account_identifier_type: string | null;
  account_identifier_value: string | null;
  account_number: string | null;
  masked_account_number: string | null;
  currency_code: string | null;
  bank_address: string | null;
  is_default: boolean;
  company_id: string | null;
  country: string | null;
  city: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
};

type PaymentMethodOption = {
  id: string;
  code: string | null;
  name: string;
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
  if (!company) return "";

  return [
    company.address_line_1,
    company.address_line_2,
    company.city,
    company.state_province,
    company.postal_code,
    company.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function getClientAddress(client: ClientOption | null) {
  if (!client) return "";

  return [
    client.address_line_1,
    client.address_line_2,
    client.city,
    client.state_province,
    client.postal_code,
    client.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function getBankAddress(bank: BankAccountOption | null) {
  if (!bank) return "";

  if (bank.bank_address) {
    return bank.bank_address;
  }

  return [
    bank.address_line_1,
    bank.address_line_2,
    bank.city,
    bank.postal_code,
    bank.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function getBankIdentifier(bank: BankAccountOption | null) {
  if (!bank) return null;

  if (bank.iban) {
    return {
      label: "IBAN",
      value: bank.iban,
    };
  }

  if (bank.swift_code) {
    return {
      label: "SWIFT",
      value: bank.swift_code,
    };
  }

  if (bank.account_identifier_value) {
    const normalizedType = (bank.account_identifier_type || "").toLowerCase();

    return {
      label: normalizedType === "swift" ? "SWIFT" : "Identifier",
      value: bank.account_identifier_value,
    };
  }

  return null;
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
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermOption[]>([]);
  const [shippingTerms, setShippingTerms] = useState<ShippingTermOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>(
    []
  );
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
  const [paymentTermsId, setPaymentTermsId] = useState("");
  const [shippingTermId, setShippingTermId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ProformaItemRow[]>([createRow()]);
  const [errorMessage, setErrorMessage] = useState("");
  const [sourceMode, setSourceMode] = useState<"manual" | "customer_po">(
    sourceClientPoId ? "customer_po" : "manual"
  );
  const [sourceCustomerPoId, setSourceCustomerPoId] = useState(
    sourceClientPoId || ""
  );
  const [customerPoSources, setCustomerPoSources] = useState<CustomerPoSource[]>(
    []
  );
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

  const selectedCurrency = useMemo(
    () => currencies.find((currency) => currency.id === currencyId) ?? null,
    [currencies, currencyId]
  );

  const selectedPaymentTerm = useMemo(
    () => paymentTerms.find((term) => term.id === paymentTermsId) ?? null,
    [paymentTerms, paymentTermsId]
  );

  const selectedShippingTerm = useMemo(
    () => shippingTerms.find((term) => term.id === shippingTermId) ?? null,
    [shippingTerms, shippingTermId]
  );

  const filteredBankAccounts = useMemo(() => {
    if (!companyId) {
      return bankAccounts;
    }

    return bankAccounts.filter(
      (account) => !account.company_id || account.company_id === companyId
    );
  }, [bankAccounts, companyId]);

  const selectedBankAccount = useMemo(
    () =>
      filteredBankAccounts.find((account) => account.id === bankAccountId) ??
      null,
    [bankAccountId, filteredBankAccounts]
  );

  const selectedPaymentMethod = useMemo(
    () => paymentMethods.find((method) => method.id === paymentMethodId) ?? null,
    [paymentMethodId, paymentMethods]
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

  useEffect(() => {
    if (!selectedClient) {
      return;
    }

    if (sourceMode === "customer_po" && sourceCustomerPo) {
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
  }, [
    currencies,
    issueDate,
    selectedClient,
    sourceCustomerPo,
    sourceMode,
    validUntil,
  ]);


  useEffect(() => {
    if (!companyId) return;

    const selectedBankStillBelongsToCompany =
      !bankAccountId ||
      filteredBankAccounts.some((account) => account.id === bankAccountId);

    if (!selectedBankStillBelongsToCompany) {
      setBankAccountId("");
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
  }, [
    bankAccountId,
    companyId,
    currencies,
    currencyId,
    filteredBankAccounts,
    selectedCompany,
  ]);

    useEffect(() => {
    if (shippingTermId) return;

    const defaultShippingTerm =
      shippingTerms.find((term) => term.is_default) ?? shippingTerms[0];

    if (defaultShippingTerm) {
      setShippingTermId(defaultShippingTerm.id);
    }
  }, [shippingTermId, shippingTerms]);

  useEffect(() => {
    if (paymentMethodId) return;

    const defaultPaymentMethod = paymentMethods[0];

    if (defaultPaymentMethod) {
      setPaymentMethodId(defaultPaymentMethod.id);
    }
  }, [paymentMethodId, paymentMethods]);

  useEffect(() => {
    if (!companyId || bankAccountId) return;

    const defaultBankAccount =
      filteredBankAccounts.find((account) => account.is_default) ??
      filteredBankAccounts[0];

    if (defaultBankAccount) {
      setBankAccountId(defaultBankAccount.id);
    }
  }, [bankAccountId, companyId, filteredBankAccounts]);

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

  const applyCustomerPoSource = useCallback(
    async (customerPoId: string) => {
      if (!customerPoId) {
        setSourceCustomerPo(null);
        setSourceCustomerPoId("");
        setClientId("");
        setProjectId("");
        setTaskId("");
        setRows([createRow()]);
        setNotes("");
        return;
      }

      setErrorMessage("");

      const { data: customerPoData, error: customerPoError } = await supabase
        .from("finance_client_purchase_orders")
        .select(
          "id, client_po_number, external_po_number, quotation_id, proforma_invoice_id, client_id, company_id, po_date, received_at, status, currency_id, currency_code, total_amount, notes, project_id, task_id"
        )
        .eq("id", customerPoId)
        .maybeSingle();

      if (customerPoError) throw customerPoError;

      const typedCustomerPo =
        (customerPoData || null) as CustomerPoSource | null;

      if (!typedCustomerPo) {
        setErrorMessage("Customer PO source was not found.");
        return;
      }

      if (typedCustomerPo.status !== "received") {
        setErrorMessage(
          "Customer PO must be marked as received before creating a proforma invoice."
        );
        return;
      }

      if (typedCustomerPo.proforma_invoice_id) {
        navigate(
          `/finance/transactions/proforma-invoices/${typedCustomerPo.proforma_invoice_id}`
        );
        return;
      }

      setSourceMode("customer_po");
      setSourceCustomerPoId(typedCustomerPo.id);
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
          .or("status.is.null,status.neq.deleted")
          .order("sort_order", { ascending: true });

      if (customerPoLinesError) throw customerPoLinesError;

      const customerPoLines =
        (customerPoLinesData || []) as CustomerPoLineSource[];

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
    },
    [navigate]
  );

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
        paymentTermsResult,
        shippingTermsResult,
        bankAccountsResult,
        paymentMethodsResult,
        itemsResult,
        taxCodesResult,
        unitsOfMeasureResult,
        revenueCategoriesResult,
        customerPoSourcesResult,
      ] = await Promise.all([
        supabase
          .from("finance_clients")
          .select(
            "id, name, legal_name, company_email, personnel_email, company_phone, personnel_phone, currency_code, payment_terms_days, payment_terms_id, country, city, state_province, postal_code, address_line_1, address_line_2"
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
          .select(
            "id, currency_code, currency_name, currency_symbol, is_base_currency"
          )
          .eq("status", "active")
          .order("currency_code", { ascending: true }),

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
            "id, name, bank_name, institution_name, beneficiary_name, iban, swift_code, account_identifier_type, account_identifier_value, account_number, masked_account_number, currency_code, bank_address, is_default, company_id, country, city, postal_code, address_line_1, address_line_2"
          )
          .eq("status", "active")
          .order("name", { ascending: true }),
        
        supabase
          .from("finance_payment_methods")
          .select("id, code, name")
          .eq("status", "active")
          .order("name", { ascending: true }),

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

        supabase
          .from("finance_client_purchase_orders")
          .select(
            "id, client_po_number, external_po_number, quotation_id, proforma_invoice_id, client_id, company_id, po_date, received_at, status, currency_id, currency_code, total_amount, notes, project_id, task_id"
          )
          .eq("status", "received")
          .is("proforma_invoice_id", null)
          .order("received_at", { ascending: false }),
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (tasksResult.error) throw tasksResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (paymentTermsResult.error) throw paymentTermsResult.error;
      if (shippingTermsResult.error) throw shippingTermsResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (paymentMethodsResult.error) throw paymentMethodsResult.error;
      if (itemsResult.error) throw itemsResult.error;
      if (taxCodesResult.error) throw taxCodesResult.error;
      if (unitsOfMeasureResult.error) throw unitsOfMeasureResult.error;
      if (revenueCategoriesResult.error) throw revenueCategoriesResult.error;
      if (customerPoSourcesResult.error) throw customerPoSourcesResult.error;

      setClients((clientsResult.data || []) as ClientOption[]);
      setCompanies((companiesResult.data || []) as CompanyOption[]);
      setProjects((projectsResult.data || []) as ProjectOption[]);
      setTasks((tasksResult.data || []) as TaskOption[]);
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
      setPaymentTerms((paymentTermsResult.data || []) as PaymentTermOption[]);
      setShippingTerms((shippingTermsResult.data || []) as ShippingTermOption[]);
      setBankAccounts((bankAccountsResult.data || []) as BankAccountOption[]);
      setPaymentMethods(
        (paymentMethodsResult.data || []) as PaymentMethodOption[]
      );
      setItems((itemsResult.data || []) as ItemOption[]);
      setTaxCodes((taxCodesResult.data || []) as TaxCodeOption[]);
      setUnitsOfMeasure(
        (unitsOfMeasureResult.data || []) as UnitOfMeasureOption[]
      );
      setRevenueCategories(
        (revenueCategoriesResult.data || []) as RevenueCategoryOption[]
      );
      setCustomerPoSources(
        (customerPoSourcesResult.data || []) as CustomerPoSource[]
      );

      const defaultPaymentTerm =
        ((paymentTermsResult.data || []) as PaymentTermOption[]).find(
          (term) => term.is_default
        ) || ((paymentTermsResult.data || []) as PaymentTermOption[])[0];

      const defaultShippingTerm =
        ((shippingTermsResult.data || []) as ShippingTermOption[]).find(
          (term) => term.is_default
        ) || ((shippingTermsResult.data || []) as ShippingTermOption[])[0];

      const defaultPaymentMethod =
        ((paymentMethodsResult.data || []) as PaymentMethodOption[])[0];

      if (!paymentTermsId && defaultPaymentTerm) {
        setPaymentTermsId(defaultPaymentTerm.id);
      }

      if (!shippingTermId && defaultShippingTerm) {
        setShippingTermId(defaultShippingTerm.id);
      }

      if (!paymentMethodId && defaultPaymentMethod) {
        setPaymentMethodId(defaultPaymentMethod.id);
      }

      if (sourceClientPoId) {
        await applyCustomerPoSource(sourceClientPoId);
      } else if (!companyId && (companiesResult.data || []).length === 1) {
        setCompanyId(companiesResult.data![0].id);
      }
    } catch (error) {
      console.error("Failed to load proforma invoice form data:", error);
      setErrorMessage("Failed to load proforma invoice form data.");
    } finally {
      setIsLoading(false);
    }
  }, [applyCustomerPoSource, companyId, paymentMethodId, paymentTermsId, shippingTermId, sourceClientPoId]);

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
        toNumber(row.quantity) * toNumber(row.unitPrice) -
          toNumber(row.discount),
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
            payment_terms_id: paymentTermsId || null,
            payment_terms_name: selectedPaymentTerm?.name || null,
            payment_terms_code: selectedPaymentTerm?.code || null,
            payment_terms_due_days: selectedPaymentTerm?.due_days ?? null,
            shipping_term_id: shippingTermId || null,
            shipping_term_name: selectedShippingTerm?.name || null,
            shipping_term_code: selectedShippingTerm?.code || null,
            client_address_snapshot: getClientAddress(selectedClient),
            bank_account_id: bankAccountId || null,
            bank_account_name: selectedBankAccount?.name || null,
            bank_name:
              selectedBankAccount?.bank_name ||
              selectedBankAccount?.institution_name ||
              null,
            beneficiary_name: selectedBankAccount?.beneficiary_name || null,
            bank_address_snapshot: getBankAddress(selectedBankAccount),
            iban: selectedBankAccount?.iban || null,
            swift_code:
              selectedBankAccount?.swift_code ||
              (selectedBankAccount?.account_identifier_type?.toLowerCase() ===
              "swift"
                ? selectedBankAccount?.account_identifier_value
                : null),
            bank_identifier_type:
              selectedBankAccount?.account_identifier_type || null,
            bank_identifier_value:
              selectedBankAccount?.account_identifier_value || null,
            account_number:
              selectedBankAccount?.account_number ||
              selectedBankAccount?.masked_account_number ||
              null,
            bank_account_currency_code:
              selectedBankAccount?.currency_code || null,
            preferred_payment_method_id: paymentMethodId || null,
            preferred_payment_method_name: selectedPaymentMethod?.name || null,
            preferred_payment_method_code: selectedPaymentMethod?.code || null,
            creation_mode: sourceCustomerPo
              ? "customer_po_prefill"
              : "manual_draft",
            client_po_id: sourceCustomerPo?.id || null,
            client_po_number: sourceCustomerPo?.client_po_number || null,
            external_po_number: sourceCustomerPo?.external_po_number || null,
            quotation_id: sourceCustomerPo?.quotation_id || null,
          },
          
          p_lines: trimmedRows.map((row) => ({
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

      const userResult = await supabase.auth.getUser();

      const { error: proformaCommercialSetupError } = await supabase
        .from("finance_proforma_invoices")
        .update({
          company_id: companyId || null,
          quotation_id: sourceCustomerPo?.quotation_id || null,
          client_po_id: sourceCustomerPo?.id || null,
          payment_terms_id: paymentTermsId || null,
          shipping_term_id: shippingTermId || null,
          bank_account_id: bankAccountId || null,
          currency_code: currencyCode || sourceCustomerPo?.currency_code || "USD",
          metadata: {
            currency_code: currencyCode || "USD",
            issuing_company_id: companyId,
            payment_terms_id: paymentTermsId || null,
            payment_terms_name: selectedPaymentTerm?.name || null,
            payment_terms_code: selectedPaymentTerm?.code || null,
            payment_terms_due_days: selectedPaymentTerm?.due_days ?? null,
            shipping_term_id: shippingTermId || null,
            shipping_term_name: selectedShippingTerm?.name || null,
            shipping_term_code: selectedShippingTerm?.code || null,
            client_address_snapshot: getClientAddress(selectedClient),
            bank_account_id: bankAccountId || null,
            bank_account_name: selectedBankAccount?.name || null,
            bank_name:
              selectedBankAccount?.bank_name ||
              selectedBankAccount?.institution_name ||
              null,
            beneficiary_name: selectedBankAccount?.beneficiary_name || null,
            bank_address_snapshot: getBankAddress(selectedBankAccount),
            iban: selectedBankAccount?.iban || null,
            swift_code:
              selectedBankAccount?.swift_code ||
              (selectedBankAccount?.account_identifier_type?.toLowerCase() ===
              "swift"
                ? selectedBankAccount?.account_identifier_value
                : null),
            bank_identifier_type:
              selectedBankAccount?.account_identifier_type || null,
            bank_identifier_value:
              selectedBankAccount?.account_identifier_value || null,
            account_number:
              selectedBankAccount?.account_number ||
              selectedBankAccount?.masked_account_number ||
              null,
            bank_account_currency_code:
              selectedBankAccount?.currency_code || null,
            preferred_payment_method_id: paymentMethodId || null,
            preferred_payment_method_name: selectedPaymentMethod?.name || null,
            preferred_payment_method_code: selectedPaymentMethod?.code || null,
            creation_mode: sourceCustomerPo
              ? "customer_po_prefill"
              : "manual_draft",
            client_po_id: sourceCustomerPo?.id || null,
            client_po_number: sourceCustomerPo?.client_po_number || null,
            external_po_number: sourceCustomerPo?.external_po_number || null,
            quotation_id: sourceCustomerPo?.quotation_id || null,
          },
          updated_by: userResult.data.user?.id || null,
        })
        .eq("id", data);

      if (proformaCommercialSetupError) throw proformaCommercialSetupError;

      if (sourceCustomerPo) {
        const { error: customerPoLinkError } = await supabase
          .from("finance_client_purchase_orders")
          .update({
            proforma_invoice_id: data,
            status: "linked_to_pi",
            linked_to_pi_at: new Date().toISOString(),
            updated_by: userResult.data.user?.id || null,
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
    bankAccountId,
    clientId,
    companyId,
    currencyCode,
    currencyId,
    issueDate,
    navigate,
    notes,
    paymentMethodId,
    paymentTermsId,
    projectId,
    rows,
    selectedBankAccount,
    selectedClient,
    selectedPaymentMethod,
    selectedPaymentTerm,
    selectedShippingTerm,
    shippingTermId,
    sourceCustomerPo,
    taskId,
    validUntil,
  ]);


  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading proforma invoice sources"
        description="Clients, companies, Customer PO sources, finance master data, bank accounts, and line-item references are being loaded."
      />
    );
  }

  const mainContent = (
    <>
      <AixiaSection
        title="Document Overview"
        description="Issuing company, client, project references, dates, currency, source mode, and notes."
        icon={SquarePen}
      >
        <AixiaFormGrid columns="three">
          <AixiaFormField>
            <AixiaFieldLabel label="Issuing Company" />
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
            <AixiaFieldLabel label="Client / Recipient" />
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

          <AixiaFormField>
            <AixiaFieldLabel label="Payment Terms" />
            <AixiaSelectField
              value={paymentTermsId}
              onChange={(event) => setPaymentTermsId(event.target.value)}
            >
              <option value="">Select terms</option>
              {paymentTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.code} | {term.name} | Due in {term.due_days} days
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
              <option value="">Select shipping terms</option>
              {shippingTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.code} | {term.name}
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
              <option value="">Select bank account</option>
              {filteredBankAccounts.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Preferred Payment Method" />
            <AixiaSelectField
              value={paymentMethodId}
              onChange={(event) => setPaymentMethodId(event.target.value)}
            >
              <option value="">Select payment method</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
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
            <AixiaFieldLabel label="Due / Valid Until" />
            <AixiaInputField
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Currency" />
            <AixiaSelectField
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
            <AixiaFieldLabel label="Source Mode" />
            <AixiaSelectField
              value={sourceMode}
              onChange={(event) => {
                const nextMode = event.target.value as "manual" | "customer_po";

                setSourceMode(nextMode);

                if (nextMode === "manual") {
                  setSourceCustomerPo(null);
                  setSourceCustomerPoId("");
                  setRows([createRow()]);
                  setNotes("");
                }
              }}
            >
              <option value="manual">Manual</option>
              <option value="customer_po">From Customer PO</option>
            </AixiaSelectField>
          </AixiaFormField>

          {sourceMode === "customer_po" ? (
            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Source Customer PO" />
              <AixiaSelectField
                value={sourceCustomerPoId}
                onChange={(event) => {
                  const nextCustomerPoId = event.target.value;
                  setSourceCustomerPoId(nextCustomerPoId);
                  void applyCustomerPoSource(nextCustomerPoId);
                }}
              >
                <option value="">Select Customer PO</option>
                {customerPoSources.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.client_po_number || "Customer PO"} ·{" "}
                    {po.external_po_number || "No external no."} ·{" "}
                    {formatMoney(
                      Number(po.total_amount || 0),
                      po.currency_code || currencyCode
                    )}
                  </option>
                ))}
              </AixiaSelectField>
            </AixiaFormFullWidth>
          ) : null}

          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Notes" />
            <AixiaTextareaField
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
            />
          </AixiaFormFullWidth>
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Line Items"
        description="Add products or services using the locked new/create line-item card pattern."
        icon={SquarePen}
        actions={
          <AixiaButton type="button" variant="secondary" onClick={addRow}>
            <Plus className="h-4 w-4" />
            Add Row
          </AixiaButton>
        }
      >
        <div className="aixia-stack">
          {rows.map((row, index) => {
            const selectedItem = items.find((item) => item.id === row.itemId);
            const selectedTaxCode = taxCodes.find(
              (taxCode) => taxCode.id === row.taxCodeId
            );
            const selectedUnit = unitsOfMeasure.find(
              (unit) => unit.id === row.unitOfMeasureId
            );
            const selectedRevenueCategory = revenueCategories.find(
              (category) => category.id === row.revenueCategoryId
            );

            const rowBase = Math.max(
              toNumber(row.quantity) * toNumber(row.unitPrice) -
                toNumber(row.discount),
              0
            );

            const rowTaxRate = selectedTaxCode?.rate_percent ?? 0;
            const rowTotal = rowBase + rowBase * (Number(rowTaxRate) / 100);

            return (
              <AixiaSection
                key={row.localId}
                title={`Line ${index + 1}`}
                description={selectedItem?.name || "Draft line item"}
                icon={FileText}
                badge={
                  selectedItem ? (
                    <AixiaBadge tone="violet">{selectedItem.name}</AixiaBadge>
                  ) : null
                }
                actions={
                  <AixiaButton
                    type="button"
                    variant="danger"
                    onClick={() => removeRow(row.localId)}
                    disabled={rows.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </AixiaButton>
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

                  <AixiaFormField>
                    <AixiaFieldLabel label="Description" />
                    <AixiaInputField
                      value={row.description}
                      onChange={(event) =>
                        updateRow(row.localId, "description", event.target.value)
                      }
                      placeholder="Description"
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Qty" />
                    <AixiaInputField
                      value={row.quantity}
                      onChange={(event) =>
                        updateRow(row.localId, "quantity", event.target.value)
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
                        updateRow(row.localId, "unitOfMeasureId", event.target.value)
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
                    <AixiaFieldLabel label="Unit Price" />
                    <AixiaInputField
                      value={row.unitPrice}
                      onChange={(event) =>
                        updateRow(row.localId, "unitPrice", event.target.value)
                      }
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Discount" />
                    <AixiaInputField
                      value={row.discount}
                      onChange={(event) =>
                        updateRow(row.localId, "discount", event.target.value)
                      }
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Tax Code" />
                    <AixiaSelectField
                      value={row.taxCodeId}
                      onChange={(event) =>
                        updateRow(row.localId, "taxCodeId", event.target.value)
                      }
                    >
                      <option value="">Select tax</option>
                      {taxCodes.map((taxCode) => (
                        <option key={taxCode.id} value={taxCode.id}>
                          {taxCode.name}
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
                        updateRow(row.localId, "revenueCategoryId", event.target.value)
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
                    detail="Calculated from quantity, unit price, discount, and tax."
                  />
                </AixiaFormGrid>
              </AixiaSection>
            );
          })}
        </div>
      </AixiaSection>
    </>
  );

  const sideContent = (
    <>
      <AixiaSection
        title="Proforma Summary"
        description="Live commercial summary before saving."
        icon={Wallet}
      >
        <AixiaFormGrid columns="one">
          <AixiaValueBlock
            label="Issuing Company"
            value={selectedCompany?.legal_name || selectedCompany?.name || "—"}
            detail={getCompanyAddress(selectedCompany) || undefined}
          />
          <AixiaValueBlock
            label="Client"
            value={selectedClient?.legal_name || selectedClient?.name || "—"}
            detail={getClientAddress(selectedClient) || undefined}
          />
          <AixiaValueBlock
            label="Source Customer PO"
            value={
              sourceCustomerPo
                ? sourceCustomerPo.client_po_number ||
                  sourceCustomerPo.external_po_number ||
                  "Linked"
                : "Manual"
            }
            detail={
              sourceCustomerPo
                ? "This PI will stay linked to the selected Customer PO."
                : "This PI will be created without a Customer PO link."
            }
          />
          <AixiaValueBlock
            label="Payment Terms"
            value={selectedPaymentTerm?.name || "—"}
            detail={
              selectedPaymentTerm
                ? `${selectedPaymentTerm.code} · Due in ${selectedPaymentTerm.due_days} days`
                : "No payment terms selected"
            }
          />
          <AixiaValueBlock
            label="Shipping Terms"
            value={selectedShippingTerm?.name || "—"}
            detail={selectedShippingTerm?.code || "No shipping terms selected"}
          />
          <AixiaValueBlock
            label="Bank Account"
            value={selectedBankAccount?.name || "—"}
            detail={
              selectedBankAccount
                ? [
                    selectedBankAccount.bank_name ||
                      selectedBankAccount.institution_name,
                    getBankAddress(selectedBankAccount),
                    selectedBankAccount.account_number ||
                      selectedBankAccount.masked_account_number
                      ? `Account: ${
                          selectedBankAccount.account_number ||
                          selectedBankAccount.masked_account_number
                        }`
                      : null,
                    getBankIdentifier(selectedBankAccount)
                      ? `${getBankIdentifier(selectedBankAccount)?.label}: ${
                          getBankIdentifier(selectedBankAccount)?.value
                        }`
                      : null,
                    selectedBankAccount.currency_code
                      ? `Currency: ${selectedBankAccount.currency_code}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" • ")
                : undefined
            }
          />
          <AixiaValueBlock
            label="Preferred Payment Method"
            value={selectedPaymentMethod?.name || "—"}
            detail={selectedPaymentMethod?.code || "No payment method selected"}
          />
          <AixiaValueBlock
            label="Currency"
            value={
              selectedCurrency
                ? `${selectedCurrency.currency_code} — ${selectedCurrency.currency_name}`
                : currencyCode || "—"
            }
          />
          <AixiaValueBlock
            label="Project / Task"
            value={selectedProject?.name || "—"}
            detail={selectedTask?.title || "No task selected"}
          />
          <AixiaValueBlock
            label="Subtotal"
            value={formatMoney(totals.subtotal, currencyCode)}
          />
          <AixiaValueBlock
            label="Discount"
            value={formatMoney(totals.discount, currencyCode)}
          />
          <AixiaValueBlock
            label="Tax"
            value={formatMoney(totals.tax, currencyCode)}
          />
          <AixiaValueBlock
            label="Total"
            value={formatMoney(totals.total, currencyCode)}
          />
        </AixiaFormGrid>

        {errorMessage ? <AixiaAlert tone="error">{errorMessage}</AixiaAlert> : null}
      </AixiaSection>

      <AixiaSection
        title="Actions"
        description="This page creates a proforma invoice draft only."
        icon={Save}
      >
        <div className="aixia-action-row">
          <AixiaButton
            type="button"
            variant="primary"
            onClick={() => void handleSaveDraft()}
            disabled={isSaving || isLoading}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Draft"}
          </AixiaButton>
        </div>

        <AixiaAlert tone="info">
          Sending, acceptance, conversion, archive, and delete actions happen later from the proforma detail workflow.
        </AixiaAlert>
      </AixiaSection>

      <AixiaSection title="Locked Behavior" icon={ShieldCheck}>
        <AixiaFormGrid columns="one">
          <AixiaDisplayBlock
            label="Draft Only"
            value="This page creates a proforma invoice draft only."
          />
          <AixiaDisplayBlock
            label="Receivables"
            value="Proforma does not affect receivables directly."
          />
          <AixiaDisplayBlock
            label="Source Link"
            value="Customer PO prefill keeps the source link intact."
          />
          <AixiaDisplayBlock
            label="Conversion"
            value="Conversion to invoice is controlled and explicit."
          />
          <AixiaDisplayBlock
            label="Master Data"
            value="Master data remains the source of truth."
          />
        </AixiaFormGrid>
      </AixiaSection>
    </>
  );

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Proforma Invoices"
        parentPath="/finance/transactions/proforma-invoices"
        badges={[
          { label: "New Proforma Invoice", tone: "cyan" },
          { label: "Draft Only", tone: "emerald" },
          { label: "No Manual Refresh", tone: "neutral" },
          ...(sourceCustomerPo
            ? [
                {
                  label: `From Customer PO ${
                    sourceCustomerPo.client_po_number ||
                    sourceCustomerPo.external_po_number ||
                    ""
                  }`,
                  tone: "violet" as const,
                },
              ]
            : []),
        ]}
        gradientTitle="Proforma"
        title="Create Proforma Invoice Draft"
        description="Create a draft proforma invoice from master data or from a customer PO. Sending, acceptance, conversion, archive, and delete actions happen later from the proforma detail workflow."
        statusCards={[
          {
            label: "Client",
            value: selectedClient?.legal_name || selectedClient?.name || "—",
            description: "Client selected for this proforma invoice draft.",
            icon: FileText,
            tone: "cyan",
          },
          {
            label: "Draft Total",
            value: formatMoney(totals.total, currencyCode),
            description: "Live total from the draft line items before saving.",
            icon: Wallet,
            tone: "emerald",
          },
        ]}
      />

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Subtotal"
          value={formatMoney(totals.subtotal, currencyCode)}
          description="Before discount and tax."
          icon={Wallet}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Discount"
          value={formatMoney(totals.discount, currencyCode)}
          description="Draft commercial discount."
          icon={Wallet}
          tone="amber"
        />
        <AixiaMetricCard
          label="Tax"
          value={formatMoney(totals.tax, currencyCode)}
          description="Based on selected tax codes."
          icon={Wallet}
          tone="violet"
        />
        <AixiaMetricCard
          label="Total"
          value={formatMoney(totals.total, currencyCode)}
          description="Draft proforma value."
          icon={Wallet}
          tone="emerald"
        />
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Locked access rule"
        description="New proforma invoice creation follows the shared AiXia new/create page and finance document source-of-truth standard."
        icon={ShieldCheck}
      >
        This page creates draft-only Proforma Invoice records from Finance master data or a received Customer PO source. It must use shared AiXia components for hero, metrics, form controls, line items, action buttons, alerts, and layout. Business logic, Supabase RPC creation, Customer PO linking, bank snapshot rules, payment terms, shipping terms, currency selection, and line-item calculations remain preserved.
      </AixiaAccessRule>

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        sideRebalance="last-to-bottom"
        main={mainContent}
        side={sideContent}
      />
    </AixiaPage>
  );
}
