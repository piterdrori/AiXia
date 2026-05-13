import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2,
  FileText,
  Plus,
  Receipt,
  Save,
  SquarePen,
  Wallet,
} from "lucide-react";

import {
  AixiaAlert,
  AixiaButton,
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

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  is_base_currency: boolean;
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

type ProformaInvoiceSource = {
  id: string;
  proforma_number: string | null;
  client_id: string | null;
  client_po_id: string | null;
  quotation_id: string | null;
  company_id: string | null;
  issue_date: string | null;
  valid_until: string | null;
  status: string;
  currency_id: string | null;
  currency_code: string | null;
  total_amount: number | string | null;
  notes: string | null;
  project_id: string | null;
  task_id: string | null;
  payment_terms_id: string | null;
  shipping_term_id: string | null;
  bank_account_id: string | null;
  metadata: Record<string, unknown> | null;
};

type ProformaInvoiceLineSource = {
  id: string;
  proforma_invoice_id: string;
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
  status: string | null;
};

type InvoiceItemRow = {
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

function createRow(): InvoiceItemRow {
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
  if (bank.bank_address) return bank.bank_address;

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
    return { label: "IBAN", value: bank.iban };
  }

  if (bank.swift_code) {
    return { label: "SWIFT", value: bank.swift_code };
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

function getBankSummary(account: BankAccountOption | null) {
  if (!account) return "No bank account selected";

  const identifier = getBankIdentifier(account);

  return [
    account.beneficiary_name || account.name,
    account.bank_name || account.institution_name,
    getBankAddress(account),
    account.account_number || account.masked_account_number
      ? `Account: ${account.account_number || account.masked_account_number}`
      : "",
    identifier ? `${identifier.label}: ${identifier.value}` : "",
    account.currency_code ? `Currency: ${account.currency_code}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}

function getRowTotal(row: InvoiceItemRow, taxCodes: TaxCodeOption[]) {
  const base = Math.max(
    toNumber(row.quantity) * toNumber(row.unitPrice) - toNumber(row.discount),
    0
  );
  const taxCode = taxCodes.find((entry) => entry.id === row.taxCodeId);
  const taxRate = toNumber(taxCode?.rate_percent) / 100;
  return base + base * taxRate;
}

export default function FinanceNewInvoicePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceProformaInvoiceId = searchParams.get("proforma_invoice_id");

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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([]);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasureOption[]>([]);
  const [revenueCategories, setRevenueCategories] = useState<RevenueCategoryOption[]>([]);

  const [clientId, setClientId] = useState("");
  const [counterpartyType, setCounterpartyType] = useState<"client" | "company">("client");
  const [counterpartyCompanyId, setCounterpartyCompanyId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [paymentTermsId, setPaymentTermsId] = useState("");
  const [shippingTermId, setShippingTermId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<InvoiceItemRow[]>([createRow()]);
  const [errorMessage, setErrorMessage] = useState("");
  const [sourceMode, setSourceMode] = useState<"manual" | "proforma_invoice">(
    sourceProformaInvoiceId ? "proforma_invoice" : "manual"
  );
  const [sourceProformaId, setSourceProformaId] = useState(sourceProformaInvoiceId || "");
  const [sourceProformaInvoice, setSourceProformaInvoice] =
    useState<ProformaInvoiceSource | null>(null);
  const [proformaSources, setProformaSources] = useState<ProformaInvoiceSource[]>([]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) ?? null,
    [clientId, clients]
  );

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === companyId) ?? null,
    [companies, companyId]
  );

  const selectedCounterpartyCompany = useMemo(
    () => companies.find((company) => company.id === counterpartyCompanyId) ?? null,
    [companies, counterpartyCompanyId]
  );

  const selectedRecipient = useMemo(() => {
    if (counterpartyType === "client") {
      return {
        name: selectedClient?.legal_name || selectedClient?.name || "—",
        address: getClientAddress(selectedClient),
        email: selectedClient?.company_email || selectedClient?.personnel_email || "",
        phone: selectedClient?.company_phone || selectedClient?.personnel_phone || "",
      };
    }

    return {
      name:
        selectedCounterpartyCompany?.legal_name ||
        selectedCounterpartyCompany?.name ||
        "—",
      address: getCompanyAddress(selectedCounterpartyCompany),
      email: selectedCounterpartyCompany?.email || "",
      phone: selectedCounterpartyCompany?.phone || "",
    };
  }, [counterpartyType, selectedClient, selectedCounterpartyCompany]);

  const selectedPaymentTerm = useMemo(
    () => paymentTerms.find((term) => term.id === paymentTermsId) ?? null,
    [paymentTerms, paymentTermsId]
  );

  const selectedShippingTerm = useMemo(
    () => shippingTerms.find((term) => term.id === shippingTermId) ?? null,
    [shippingTerms, shippingTermId]
  );

  const filteredBankAccounts = useMemo(() => {
    if (!companyId) return bankAccounts;
    return bankAccounts.filter(
      (account) => !account.company_id || account.company_id === companyId
    );
  }, [bankAccounts, companyId]);

  const selectedBankAccount = useMemo(
    () => filteredBankAccounts.find((account) => account.id === bankAccountId) ?? null,
    [bankAccountId, filteredBankAccounts]
  );

  const selectedCurrency = useMemo(
    () => currencies.find((currency) => currency.id === currencyId) ?? null,
    [currencies, currencyId]
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
    if (!projectId) return tasks;
    return tasks.filter((task) => task.project_id === projectId);
  }, [projectId, tasks]);

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
      return taxCode ? sum + base * (toNumber(taxCode.rate_percent) / 100) : sum;
    }, 0);

    return {
      subtotal,
      discount,
      tax,
      total: Math.max(subtotal - discount + tax, 0),
    };
  }, [rows, taxCodes]);

  useEffect(() => {
    if (counterpartyType === "client") {
      setCounterpartyCompanyId("");
      return;
    }

    setClientId("");
  }, [counterpartyType]);

  useEffect(() => {
    if (!selectedClient) return;

    if (selectedClient.currency_code) {
      setCurrencyCode(selectedClient.currency_code);
      const matchedCurrency = currencies.find(
        (entry) => entry.currency_code === selectedClient.currency_code
      );
      if (matchedCurrency) setCurrencyId(matchedCurrency.id);
    }

    if (selectedClient.payment_terms_id) {
      setPaymentTermsId(selectedClient.payment_terms_id);
    }

    if (!dueDate) {
      const days = selectedClient.payment_terms_days ?? 14;
      const base = new Date(issueDate || new Date().toISOString().slice(0, 10));
      base.setDate(base.getDate() + days);
      setDueDate(base.toISOString().slice(0, 10));
    }
  }, [currencies, dueDate, issueDate, selectedClient]);

  useEffect(() => {
    if (!companyId) return;

    const selectedBankStillBelongsToCompany = selectedBankAccount
      ? !selectedBankAccount.company_id || selectedBankAccount.company_id === companyId
      : true;

    if (!selectedBankStillBelongsToCompany) setBankAccountId("");

    if (!currencyId && selectedCompany?.currency_code) {
      const matchedCurrency = currencies.find(
        (entry) => entry.currency_code === selectedCompany.currency_code
      );

      if (matchedCurrency) {
        setCurrencyId(matchedCurrency.id);
        setCurrencyCode(matchedCurrency.currency_code);
      }
    }
  }, [companyId, currencies, currencyId, selectedBankAccount, selectedCompany]);

  useEffect(() => {
    if (shippingTermId) return;
    const defaultShippingTerm =
      shippingTerms.find((term) => term.is_default) ?? shippingTerms[0];
    if (defaultShippingTerm) setShippingTermId(defaultShippingTerm.id);
  }, [shippingTermId, shippingTerms]);

  useEffect(() => {
    if (paymentTermsId) return;
    const defaultPaymentTerm =
      paymentTerms.find((term) => term.is_default) ?? paymentTerms[0];
    if (defaultPaymentTerm) setPaymentTermsId(defaultPaymentTerm.id);
  }, [paymentTerms, paymentTermsId]);

  useEffect(() => {
    if (paymentMethodId) return;
    const defaultPaymentMethod = paymentMethods[0];
    if (defaultPaymentMethod) setPaymentMethodId(defaultPaymentMethod.id);
  }, [paymentMethodId, paymentMethods]);

  useEffect(() => {
    if (!companyId || bankAccountId) return;
    const defaultBank =
      filteredBankAccounts.find((account) => account.is_default) ?? filteredBankAccounts[0];
    if (defaultBank) setBankAccountId(defaultBank.id);
  }, [bankAccountId, companyId, filteredBankAccounts]);

  useEffect(() => {
    if (!projectId) {
      setTaskId("");
      return;
    }

    const matchingTaskStillValid = filteredTasks.some((task) => task.id === taskId);
    if (!matchingTaskStillValid) setTaskId("");
  }, [filteredTasks, projectId, taskId]);

  const applyProformaSource = useCallback(async (proformaId: string) => {
    if (!proformaId) {
      setSourceMode("manual");
      setSourceProformaId("");
      setSourceProformaInvoice(null);
      setRows([createRow()]);
      setNotes("");
      return;
    }

    setErrorMessage("");

    const { data: proformaData, error: proformaError } = await supabase
      .from("finance_proforma_invoices")
      .select(
        "id, proforma_number, client_id, client_po_id, quotation_id, company_id, issue_date, valid_until, status, currency_id, currency_code, total_amount, notes, project_id, task_id, payment_terms_id, shipping_term_id, bank_account_id, metadata"
      )
      .eq("id", proformaId)
      .maybeSingle();

    if (proformaError) throw proformaError;

    const typedProforma = (proformaData || null) as ProformaInvoiceSource | null;

    if (!typedProforma) {
      setErrorMessage("Proforma invoice source was not found.");
      return;
    }

    if (typedProforma.status !== "confirmed") {
      setErrorMessage("Proforma invoice must be confirmed before creating an invoice.");
      return;
    }

    setSourceMode("proforma_invoice");
    setSourceProformaId(typedProforma.id);
    setSourceProformaInvoice(typedProforma);
    setCounterpartyType("client");
    setClientId(typedProforma.client_id || "");
    setCounterpartyCompanyId("");
    setCompanyId(typedProforma.company_id || "");
    setProjectId(typedProforma.project_id || "");
    setTaskId(typedProforma.task_id || "");
    setPaymentTermsId(typedProforma.payment_terms_id || "");
    setShippingTermId(typedProforma.shipping_term_id || "");
    setBankAccountId(typedProforma.bank_account_id || "");
    setCurrencyId(typedProforma.currency_id || "");
    setCurrencyCode(typedProforma.currency_code || "USD");
    setIssueDate(new Date().toISOString().slice(0, 10));

    const nextDueDate = typedProforma.valid_until
      ? new Date(typedProforma.valid_until)
      : new Date();

    if (!typedProforma.valid_until) nextDueDate.setDate(nextDueDate.getDate() + 30);
    setDueDate(nextDueDate.toISOString().slice(0, 10));

    setNotes(
      [
        `Created from Proforma Invoice: ${
          typedProforma.proforma_number || typedProforma.id
        }`,
        typedProforma.notes || "",
      ]
        .filter(Boolean)
        .join("\n")
    );

    const { data: proformaLinesData, error: proformaLinesError } = await supabase
      .from("finance_proforma_invoice_line_items")
      .select(
        "id, proforma_invoice_id, item_id, description, quantity, unit_price, discount, sort_order, unit_of_measure_id, tax_code_id, revenue_category_id, project_id, task_id, status"
      )
      .eq("proforma_invoice_id", typedProforma.id)
      .or("status.is.null,status.neq.deleted")
      .order("sort_order", { ascending: true });

    if (proformaLinesError) throw proformaLinesError;

    const proformaLines = (proformaLinesData || []) as ProformaInvoiceLineSource[];

    setRows(
      proformaLines.length > 0
        ? proformaLines.map((line) => ({
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
        : [
            {
              localId: crypto.randomUUID(),
              itemId: "",
              description: `Proforma Invoice ${
                typedProforma.proforma_number || ""
              }`.trim(),
              quantity: "1",
              unitPrice: String(toNumber(typedProforma.total_amount)),
              discount: "0",
              taxCodeId: "",
              unitOfMeasureId: "",
              revenueCategoryId: "",
            },
          ]
    );
  }, []);

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
        paymentMethodsResult,
        itemsResult,
        taxCodesResult,
        unitsOfMeasureResult,
        revenueCategoriesResult,
        proformaSourcesResult,
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
        supabase.from("projects").select("id, name").order("name", { ascending: true }),
        supabase.from("tasks").select("id, title, project_id").order("created_at", { ascending: false }),
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
          .from("finance_currencies")
          .select("id, currency_code, currency_name, currency_symbol, is_base_currency")
          .eq("status", "active")
          .order("currency_code", { ascending: true }),
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
          .from("finance_proforma_invoices")
          .select(
            "id, proforma_number, client_id, client_po_id, quotation_id, company_id, issue_date, valid_until, status, currency_id, currency_code, total_amount, notes, project_id, task_id, payment_terms_id, shipping_term_id, bank_account_id, metadata"
          )
          .eq("status", "confirmed")
          .order("updated_at", { ascending: false }),
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (tasksResult.error) throw tasksResult.error;
      if (paymentTermsResult.error) throw paymentTermsResult.error;
      if (shippingTermsResult.error) throw shippingTermsResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (paymentMethodsResult.error) throw paymentMethodsResult.error;
      if (itemsResult.error) throw itemsResult.error;
      if (taxCodesResult.error) throw taxCodesResult.error;
      if (unitsOfMeasureResult.error) throw unitsOfMeasureResult.error;
      if (revenueCategoriesResult.error) throw revenueCategoriesResult.error;
      if (proformaSourcesResult.error) throw proformaSourcesResult.error;

      const loadedCompanies = (companiesResult.data || []) as CompanyOption[];
      const loadedPaymentTerms = (paymentTermsResult.data || []) as PaymentTermOption[];
      const loadedShippingTerms = (shippingTermsResult.data || []) as ShippingTermOption[];
      const loadedPaymentMethods = (paymentMethodsResult.data || []) as PaymentMethodOption[];

      setClients((clientsResult.data || []) as ClientOption[]);
      setCompanies(loadedCompanies);
      setProjects((projectsResult.data || []) as ProjectOption[]);
      setTasks((tasksResult.data || []) as TaskOption[]);
      setPaymentTerms(loadedPaymentTerms);
      setShippingTerms(loadedShippingTerms);
      setBankAccounts((bankAccountsResult.data || []) as BankAccountOption[]);
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
      setPaymentMethods(loadedPaymentMethods);
      setItems((itemsResult.data || []) as ItemOption[]);
      setTaxCodes((taxCodesResult.data || []) as TaxCodeOption[]);
      setUnitsOfMeasure((unitsOfMeasureResult.data || []) as UnitOfMeasureOption[]);
      setRevenueCategories((revenueCategoriesResult.data || []) as RevenueCategoryOption[]);
      setProformaSources((proformaSourcesResult.data || []) as ProformaInvoiceSource[]);

      if (!companyId && loadedCompanies.length === 1) {
        setCompanyId(loadedCompanies[0].id);
      }

      const defaultPaymentTerm =
        loadedPaymentTerms.find((term) => term.is_default) || loadedPaymentTerms[0];
      const defaultShippingTerm =
        loadedShippingTerms.find((term) => term.is_default) || loadedShippingTerms[0];
      const defaultPaymentMethod = loadedPaymentMethods[0];

      if (!paymentTermsId && defaultPaymentTerm) setPaymentTermsId(defaultPaymentTerm.id);
      if (!shippingTermId && defaultShippingTerm) setShippingTermId(defaultShippingTerm.id);
      if (!paymentMethodId && defaultPaymentMethod) setPaymentMethodId(defaultPaymentMethod.id);

      if (sourceProformaInvoiceId) {
        await applyProformaSource(sourceProformaInvoiceId);
      }
    } catch (error) {
      console.error("Failed to load invoice form data:", error);
      setErrorMessage("Failed to load invoice form data.");
    } finally {
      setIsLoading(false);
    }
  }, [applyProformaSource, sourceProformaInvoiceId]);

  useEffect(() => {
    void loadFormData();
  }, [loadFormData]);

  const updateRow = useCallback(
    (localId: string, field: keyof InvoiceItemRow, value: string) => {
      setRows((current) =>
        current.map((row) => (row.localId === localId ? { ...row, [field]: value } : row))
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

          if (!selectedItem) return { ...row, itemId: "" };

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

      if (isLastEmpty) return current;
      return [...current, createRow()];
    });
  }, []);

  const removeRow = useCallback((localId: string) => {
    setRows((current) => {
      if (current.length === 1) return current;
      return current.filter((row) => row.localId !== localId);
    });
  }, []);

  const resetManualSource = useCallback(() => {
    setSourceMode("manual");
    setSourceProformaId("");
    setSourceProformaInvoice(null);
    setClientId("");
    setCounterpartyCompanyId("");
    setCompanyId("");
    setProjectId("");
    setTaskId("");
    setPaymentTermsId("");
    setShippingTermId("");
    setBankAccountId("");
    setCurrencyId("");
    setCurrencyCode("USD");
    setDueDate("");
    setRows([createRow()]);
    setNotes("");
    setErrorMessage("");
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

    const trimmedRows = rows.map((row) => ({ ...row, description: row.description.trim() }));
    const hasAtLeastOneValidRow = trimmedRows.some(
      (row) => row.description && toNumber(row.quantity) > 0 && toNumber(row.unitPrice) >= 0
    );

    if (!hasAtLeastOneValidRow) {
      setErrorMessage("Add at least one valid line item.");
      return;
    }

    const hasInvalidRow = trimmedRows.some(
      (row) => !row.description || toNumber(row.quantity) <= 0 || toNumber(row.unitPrice) < 0
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

      if (!user?.id) throw new Error("User not authenticated");

      const { data: createdInvoiceId, error: invoiceError } = await supabase.rpc(
        "finance_create_invoice_draft",
        {
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
          p_due_date: dueDate || issueDate,
          p_notes: notes || null,
          p_currency_code: currencyCode || "USD",
          p_exchange_rate: 1,
          p_payment_method_id: paymentMethodId || null,
          p_created_by: user.id,
        }
      );

      if (invoiceError) throw invoiceError;
      if (!createdInvoiceId) throw new Error("Invoice was not created");

      if (sourceProformaInvoice) {
        const { error: sourceLinkError } = await supabase
          .from("finance_invoices_issued")
          .update({
            proforma_invoice_id: sourceProformaInvoice.id,
            metadata: {
              source: "proforma_invoice_prefill",
              proforma_invoice_id: sourceProformaInvoice.id,
              proforma_number: sourceProformaInvoice.proforma_number || null,
              client_po_id: sourceProformaInvoice.client_po_id || null,
              quotation_id: sourceProformaInvoice.quotation_id || null,
            },
          })
          .eq("id", createdInvoiceId);

        if (sourceLinkError) throw sourceLinkError;

        const { data: existingProformaMetadataRow, error: proformaMetadataError } =
          await supabase
            .from("finance_proforma_invoices")
            .select("metadata")
            .eq("id", sourceProformaInvoice.id)
            .maybeSingle();

        if (proformaMetadataError) throw proformaMetadataError;

        const existingProformaMetadata =
          existingProformaMetadataRow &&
          typeof existingProformaMetadataRow.metadata === "object" &&
          existingProformaMetadataRow.metadata !== null
            ? (existingProformaMetadataRow.metadata as Record<string, unknown>)
            : {};

        const { error: proformaConvertedError } = await supabase
          .from("finance_proforma_invoices")
          .update({
            status: "converted",
            metadata: {
              ...existingProformaMetadata,
              converted_to_invoice_id: createdInvoiceId,
              converted_to_invoice_at: new Date().toISOString(),
              converted_to_invoice_by: user.id,
            },
            updated_by: user.id,
          })
          .eq("id", sourceProformaInvoice.id)
          .eq("status", "confirmed");

        if (proformaConvertedError) throw proformaConvertedError;
      }

      const linePayload = trimmedRows.map((row, index) => ({
        item_id: row.itemId || null,
        description: row.description.trim(),
        quantity: toNumber(row.quantity),
        unit_price: toNumber(row.unitPrice),
        discount: toNumber(row.discount),
        tax_code_id: row.taxCodeId || null,
        unit_of_measure_id: row.unitOfMeasureId || null,
        revenue_category_id: row.revenueCategoryId || null,
        sort_order: index + 1,
      }));

      const { error: lineError } = await supabase.rpc(
        "finance_insert_invoice_issued_line_items",
        {
          p_invoice_id: createdInvoiceId,
          p_lines: linePayload,
          p_user_id: user.id,
        }
      );

      if (lineError) throw lineError;

      const { error: recalcError } = await supabase.rpc(
        "finance_recalculate_invoice_issued_totals",
        { p_invoice_id: createdInvoiceId }
      );

      if (recalcError) throw recalcError;

      navigate(`/finance/transactions/invoices/${createdInvoiceId}`);
    } catch (error) {
      console.error("Failed to save invoice draft:", error);
      setErrorMessage("Failed to save invoice draft.");
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
    dueDate,
    issueDate,
    navigate,
    notes,
    paymentMethodId,
    paymentTermsId,
    projectId,
    rows,
    shippingTermId,
    sourceProformaInvoice,
    taskId,
  ]);

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading invoice sources"
        description="Client, company, bank, tax, item, and proforma source data are being loaded."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Invoices"
        parentPath="/finance/transactions/invoices"
        badges={[
          { label: "New Invoice Draft", tone: "cyan" },
          { label: "Receivables", tone: "emerald" },
          { label: sourceMode === "proforma_invoice" ? "From PI" : "Manual", tone: "neutral" },
        ]}
        gradientTitle="Create"
        title="Invoice Draft"
        subtitle="Draft-only receivables creation"
        description="Build a draft invoice from master data or a confirmed proforma invoice. Issue the invoice later from the invoice detail page."
        statusCards={[
          {
            label: "Recipient",
            value: selectedRecipient.name,
            description: "Recipient selected for this invoice draft.",
            icon: counterpartyType === "client" ? FileText : Building2,
            tone: "cyan",
          },
          {
            label: "Draft Total",
            value: formatMoney(totals.total, currencyCode),
            description: "Live total from draft line items before saving.",
            icon: Wallet,
            tone: "emerald",
          },
        ]}
        actions={
          <>
            <AixiaButton
              type="button"
              variant="primary"
              disabled={isSaving || isLoading}
              onClick={() => void handleSaveDraft()}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Draft"}
            </AixiaButton>
          </>
        }
      />

      {errorMessage ? <AixiaAlert tone="error">{errorMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Subtotal"
          value={formatMoney(totals.subtotal, currencyCode)}
          description="Before discount and tax."
          icon={Receipt}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Discount"
          value={formatMoney(totals.discount, currencyCode)}
          description="Draft commercial discount."
          icon={Receipt}
          tone="gold"
        />
        <AixiaMetricCard
          label="Tax"
          value={formatMoney(totals.tax, currencyCode)}
          description="Based on selected tax codes."
          icon={Receipt}
          tone="violet"
        />
        <AixiaMetricCard
          label="Total"
          value={formatMoney(totals.total, currencyCode)}
          description="Draft invoice value."
          icon={Wallet}
          tone="emerald"
        />
      </AixiaMetricGrid>

      <AixiaSmartLayout
        main={
          <>
            <AixiaSection
              title="Document Overview"
              description="Issuing company, recipient, commercial terms, dates, currency, source mode, project, and task."
              icon={SquarePen}
            >
              <AixiaFormGrid columns="three">
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
                  <AixiaFieldLabel label="Recipient Type" required />
                  <AixiaSelectField
                    value={counterpartyType}
                    onChange={(event) =>
                      setCounterpartyType(event.target.value as "client" | "company")
                    }
                  >
                    <option value="client">Client</option>
                    <option value="company">My Company</option>
                  </AixiaSelectField>
                </AixiaFormField>

                {counterpartyType === "client" ? (
                  <AixiaFormField>
                    <AixiaFieldLabel label="Client / Recipient" required />
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
                      onChange={(event) => setCounterpartyCompanyId(event.target.value)}
                    >
                      <option value="">Select company</option>
                      {companies
                        .filter((company) => company.id !== companyId)
                        .map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.legal_name || company.name}
                          </option>
                        ))}
                    </AixiaSelectField>
                  </AixiaFormField>
                )}

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
                  <AixiaFieldLabel label="Due Date" />
                  <AixiaInputField
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Currency" />
                  <AixiaSelectField
                    value={currencyId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      setCurrencyId(nextId);
                      const matchedCurrency = currencies.find((entry) => entry.id === nextId);
                      if (matchedCurrency) setCurrencyCode(matchedCurrency.currency_code);
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
                      const nextMode = event.target.value as "manual" | "proforma_invoice";
                      if (nextMode === "manual") {
                        resetManualSource();
                        return;
                      }

                      setSourceMode("proforma_invoice");
                      setSourceProformaId("");
                      setSourceProformaInvoice(null);
                      setRows([createRow()]);
                      setNotes("");
                    }}
                  >
                    <option value="manual">Manual</option>
                    <option value="proforma_invoice">From Proforma Invoice</option>
                  </AixiaSelectField>
                </AixiaFormField>

                {sourceMode === "proforma_invoice" ? (
                  <AixiaFormField>
                    <AixiaFieldLabel label="Proforma Invoice Source" />
                    <AixiaSelectField
                      value={sourceProformaId}
                      onChange={(event) => {
                        const nextProformaId = event.target.value;
                        setSourceProformaId(nextProformaId);
                        if (!nextProformaId) return;
                        setRows([]);
                        setNotes("");
                        void applyProformaSource(nextProformaId);
                      }}
                    >
                      <option value="">Select Proforma Invoice</option>
                      {proformaSources.map((proforma) => (
                        <option key={proforma.id} value={proforma.id}>
                          {proforma.proforma_number || "Proforma Invoice"} ·{" "}
                          {formatMoney(
                            Number(proforma.total_amount || 0),
                            proforma.currency_code || currencyCode
                          )}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormField>
                ) : null}

                <AixiaFormFullWidth>
                  <AixiaFormField>
                    <AixiaFieldLabel label="Notes" />
                    <AixiaTextareaField
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={4}
                    />
                  </AixiaFormField>
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
              smartScroll
              visibleCards={8}
              itemCount={rows.length}
            >
              <div className="aixia-stack">
                {rows.map((row, index) => {
                  const selectedItem = items.find((item) => item.id === row.itemId);
                  const selectedTaxCode = taxCodes.find((taxCode) => taxCode.id === row.taxCodeId);
                  const selectedUnit = unitsOfMeasure.find((unit) => unit.id === row.unitOfMeasureId);
                  const selectedRevenueCategory = revenueCategories.find(
                    (category) => category.id === row.revenueCategoryId
                  );
                  const rowTotal = getRowTotal(row, taxCodes);

                  return (
                    <AixiaFormRowCard
                      key={row.localId}
                      title={`Line ${index + 1}`}
                      description={selectedItem?.name || "Draft invoice line"}
                      onRemove={() => removeRow(row.localId)}
                      removeDisabled={rows.length === 1}
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
                          <AixiaFieldLabel label="Quantity" />
                          <AixiaInputField
                            value={row.quantity}
                            onChange={(event) =>
                              updateRow(row.localId, "quantity", event.target.value)
                            }
                          />
                        </AixiaFormField>

                        <AixiaFormField>
                          <AixiaFieldLabel label="Unit" helper={selectedUnit?.code || undefined} />
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
                          <AixiaFieldLabel label="Tax Code" helper={selectedTaxCode?.code || undefined} />
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

                        <AixiaValueBlock
                          label="Line Total"
                          value={formatMoney(rowTotal, currencyCode)}
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
              title="Invoice Summary"
              description="Live commercial summary before saving."
              icon={Wallet}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Issuing Company"
                  value={selectedCompany?.legal_name || selectedCompany?.name || "—"}
                  detail={getCompanyAddress(selectedCompany) || undefined}
                />
                <AixiaValueBlock
                  label="Recipient"
                  value={selectedRecipient.name}
                  detail={
                    [selectedRecipient.address, selectedRecipient.email, selectedRecipient.phone]
                      .filter(Boolean)
                      .join(" • ") || undefined
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
                  detail={getBankSummary(selectedBankAccount)}
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
                <AixiaValueBlock label="Tax" value={formatMoney(totals.tax, currencyCode)} />
                <AixiaValueBlock label="Total" value={formatMoney(totals.total, currencyCode)} />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Locked Behavior"
              description="New invoice creation rules."
              icon={FileText}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock label="Creation Mode" value="Draft only" />
                <AixiaValueBlock label="Invoice Number" value="Finalized on issue" />
                <AixiaValueBlock label="Issue Action" value="Detail page only" />
                <AixiaValueBlock label="Source Values" value="Master data controlled" />
                <AixiaValueBlock label="Snapshot" value="Frozen when issued" />
              </AixiaReviewGrid>
            </AixiaSection>
          </>
        }
      />
    </AixiaPage>
  );
}
