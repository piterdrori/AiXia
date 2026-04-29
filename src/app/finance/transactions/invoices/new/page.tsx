import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  FileText,
  Plus,
  Save,
  SquarePen,
  Trash2,
  Wallet,
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

  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [currencyId, setCurrencyId] = useState("");

  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<InvoiceItemRow[]>([createRow()]);
const [errorMessage, setErrorMessage] = useState("");
const [sourceMode, setSourceMode] = useState<"manual" | "proforma_invoice">(
  sourceProformaInvoiceId ? "proforma_invoice" : "manual"
);
const [sourceProformaId, setSourceProformaId] = useState(
  sourceProformaInvoiceId || ""
);
const [sourceProformaInvoice, setSourceProformaInvoice] =
  useState<ProformaInvoiceSource | null>(null);
const [proformaSources, setProformaSources] = useState<
  ProformaInvoiceSource[]
>([]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) ?? null,
    [clientId, clients]
  );

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === companyId) ?? null,
    [companies, companyId]
  );

  const selectedCounterpartyCompany = useMemo(
    () =>
      companies.find((company) => company.id === counterpartyCompanyId) ??
      null,
    [companies, counterpartyCompanyId]
  );

  const selectedRecipient = useMemo(() => {
    if (counterpartyType === "client") {
      return {
        name: selectedClient?.legal_name || selectedClient?.name || "—",
        address: getClientAddress(selectedClient),
        email:
          selectedClient?.company_email || selectedClient?.personnel_email || "",
        phone:
          selectedClient?.company_phone || selectedClient?.personnel_phone || "",
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
    if (!projectId) {
      return tasks;
    }

    return tasks.filter((task) => task.project_id === projectId);
  }, [projectId, tasks]);

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
    companyId,
    currencies,
    currencyId,
    selectedBankAccount,
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
    if (paymentTermsId) return;

    const defaultPaymentTerm =
      paymentTerms.find((term) => term.is_default) ?? paymentTerms[0];

    if (defaultPaymentTerm) {
      setPaymentTermsId(defaultPaymentTerm.id);
    }
  }, [paymentTerms, paymentTermsId]);

  useEffect(() => {
    if (paymentMethodId) return;

    const defaultPaymentMethod = paymentMethods[0];

    if (defaultPaymentMethod) {
      setPaymentMethodId(defaultPaymentMethod.id);
    }
  }, [paymentMethodId, paymentMethods]);

  useEffect(() => {
    if (!companyId || bankAccountId) return;

    const defaultBank =
      filteredBankAccounts.find((account) => account.is_default) ??
      filteredBankAccounts[0];

    if (defaultBank) {
      setBankAccountId(defaultBank.id);
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

    const typedProforma =
      (proformaData || null) as ProformaInvoiceSource | null;

    if (!typedProforma) {
      setErrorMessage("Proforma invoice source was not found.");
      return;
    }

    if (!["issued", "confirmed"].includes(typedProforma.status)) {
      setErrorMessage(
        "Proforma invoice must be issued or confirmed before creating an invoice."
      );
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

    if (!typedProforma.valid_until) {
      nextDueDate.setDate(nextDueDate.getDate() + 30);
    }

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

    const { data: proformaLinesData, error: proformaLinesError } =
      await supabase
        .from("finance_proforma_invoice_line_items")
        .select(
          "id, proforma_invoice_id, item_id, description, quantity, unit_price, discount, sort_order, unit_of_measure_id, tax_code_id, revenue_category_id, project_id, task_id, status"
        )
        .eq("proforma_invoice_id", typedProforma.id)
        .or("status.is.null,status.neq.deleted")
        .order("sort_order", { ascending: true });

    if (proformaLinesError) throw proformaLinesError;

    const proformaLines =
      (proformaLinesData || []) as ProformaInvoiceLineSource[];

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
            "id, name, bank_name, institution_name, beneficiary_name, iban, swift_code, account_identifier_type, account_identifier_value, account_number, masked_account_number, currency_code, bank_address, is_default, company_id, country, city, postal_code, address_line_1, address_line_2"
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
          .in("status", ["issued", "confirmed"])
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

      setClients((clientsResult.data || []) as ClientOption[]);
      setCompanies((companiesResult.data || []) as CompanyOption[]);
      setProjects((projectsResult.data || []) as ProjectOption[]);
      setTasks((tasksResult.data || []) as TaskOption[]);
      setPaymentTerms((paymentTermsResult.data || []) as PaymentTermOption[]);
      setShippingTerms((shippingTermsResult.data || []) as ShippingTermOption[]);
      setBankAccounts((bankAccountsResult.data || []) as BankAccountOption[]);
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
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
      setProformaSources(
        (proformaSourcesResult.data || []) as ProformaInvoiceSource[]
      );

      if (!companyId && (companiesResult.data || []).length === 1) {
        setCompanyId(companiesResult.data![0].id);
      }

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

      if (sourceProformaInvoiceId) {
        await applyProformaSource(sourceProformaInvoiceId);
      }
    } catch (error) {
      console.error("Failed to load invoice form data:", error);
      setErrorMessage("Failed to load invoice form data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

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

      return sum + base * (toNumber(taxCode.rate_percent) / 100);
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
    (localId: string, field: keyof InvoiceItemRow, value: string) => {
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

      const { data: createdInvoiceId, error: invoiceError } =
        await supabase.rpc("finance_create_invoice_draft", {
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
        });

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
        {
          p_invoice_id: createdInvoiceId,
        }
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

  const activeSectionClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";

  const summaryBlockClass =
    "rounded-[24px] border border-white/10 bg-black/20 p-4";

  const fieldShellClass =
    "mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30";

  const inputFieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";

  const labelClass = "text-[11px] uppercase tracking-[0.2em] text-slate-500";

  const inputLabelClass = "text-sm font-medium text-slate-300";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Loading invoice sources...
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
              onClick={() => navigate("/finance/transactions/invoices")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Invoices
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    New Invoice Draft
                  </Badge>

                  <Badge className="inline-flex w-fit rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                    Receivables
                  </Badge>
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Create Invoice Draft
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Build a draft invoice from master data, save it, then issue it
                  later from the invoice detail page.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-none">
                    Draft only
                  </Badge>
                  <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200 shadow-none">
                    Issue later
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
                        Recipient
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {selectedRecipient.name}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      {counterpartyType === "client" ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <Building2 className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Recipient selected for this invoice draft.
                  </p>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Draft Total
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {formatMoney(totals.total, currencyCode)}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                      <Wallet className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Live total from the draft line items before saving.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => void handleSaveDraft()}
                disabled={isSaving || isLoading}
                className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Draft"}
              </Button>

              {errorMessage ? (
                <div className="flex min-h-11 items-center rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm text-rose-200">
                  {errorMessage}
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
                  {formatMoney(totals.subtotal, currencyCode)}
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
                  {formatMoney(totals.discount, currencyCode)}
                </div>
                <div className="mt-2 truncate text-sm leading-6 text-slate-400">
                  Draft commercial discount.
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
                  {formatMoney(totals.tax, currencyCode)}
                </div>
                <div className="mt-2 truncate text-sm leading-6 text-slate-400">
                  Based on selected tax codes.
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
                  {formatMoney(totals.total, currencyCode)}
                </div>
                <div className="mt-2 truncate text-sm leading-6 text-slate-400">
                  Draft invoice value.
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
                      Issuing company, recipient, commercial terms, dates, and currency.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                <div className={summaryBlockClass}>
                  <div className={labelClass}>Issuing Company</div>
                  <select
                    value={companyId}
                    onChange={(event) => setCompanyId(event.target.value)}
                    className={fieldShellClass}
                  >
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.legal_name || company.name}
                      </option>
                    ))}
                  </select>

                  {selectedCompany ? (
                    <div className="mt-3 text-sm leading-6 text-slate-300">
                      <div className="font-semibold text-white">
                        {selectedCompany.legal_name || selectedCompany.name}
                      </div>
                      {getCompanyAddress(selectedCompany) ? (
                        <div>{getCompanyAddress(selectedCompany)}</div>
                      ) : null}
                      {selectedCompany.email ? (
                        <div>Email: {selectedCompany.email}</div>
                      ) : null}
                      {selectedCompany.phone ? (
                        <div>Phone: {selectedCompany.phone}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                                <div className={summaryBlockClass}>
                  <div className={labelClass}>Recipient Type</div>
                  <select
                    value={counterpartyType}
                    onChange={(event) =>
                      setCounterpartyType(
                        event.target.value as "client" | "company"
                      )
                    }
                    className={fieldShellClass}
                  >
                    <option value="client">Client</option>
                    <option value="company">My Company</option>
                  </select>
                </div>

                {counterpartyType === "client" ? (
                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Client / Recipient</div>
                    <select
                      value={clientId}
                      onChange={(event) => setClientId(event.target.value)}
                      className={fieldShellClass}
                    >
                      <option value="">Select client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.legal_name || client.name}
                        </option>
                      ))}
                    </select>

                    {selectedClient ? (
                      <div className="mt-3 text-sm leading-6 text-slate-300">
                        <div className="font-semibold text-white">
                          {selectedClient.legal_name || selectedClient.name}
                        </div>
                        {getClientAddress(selectedClient) ? (
                          <div>{getClientAddress(selectedClient)}</div>
                        ) : null}
                        {selectedClient.company_email ||
                        selectedClient.personnel_email ? (
                          <div>
                            Email:{" "}
                            {selectedClient.company_email ||
                              selectedClient.personnel_email}
                          </div>
                        ) : null}
                        {selectedClient.company_phone ||
                        selectedClient.personnel_phone ? (
                          <div>
                            Phone:{" "}
                            {selectedClient.company_phone ||
                              selectedClient.personnel_phone}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Receiving Company</div>
                    <select
                      value={counterpartyCompanyId}
                      onChange={(event) =>
                        setCounterpartyCompanyId(event.target.value)
                      }
                      className={fieldShellClass}
                    >
                      <option value="">Select company</option>
                      {companies
                        .filter((company) => company.id !== companyId)
                        .map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.legal_name || company.name}
                          </option>
                        ))}
                    </select>

                    {selectedCounterpartyCompany ? (
                      <div className="mt-3 text-sm leading-6 text-slate-300">
                        <div className="font-semibold text-white">
                          {selectedCounterpartyCompany.legal_name ||
                            selectedCounterpartyCompany.name}
                        </div>
                        {getCompanyAddress(selectedCounterpartyCompany) ? (
                          <div>
                            {getCompanyAddress(selectedCounterpartyCompany)}
                          </div>
                        ) : null}
                        {selectedCounterpartyCompany.email ? (
                          <div>Email: {selectedCounterpartyCompany.email}</div>
                        ) : null}
                        {selectedCounterpartyCompany.phone ? (
                          <div>Phone: {selectedCounterpartyCompany.phone}</div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Payment Terms</div>
                  <select
                    value={paymentTermsId}
                    onChange={(event) => setPaymentTermsId(event.target.value)}
                    className={fieldShellClass}
                  >
                    <option value="">Select terms</option>
                    {paymentTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.code} | {term.name} | Due in {term.due_days} days
                      </option>
                    ))}
                  </select>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Shipping Terms</div>
                  <select
                    value={shippingTermId}
                    onChange={(event) => setShippingTermId(event.target.value)}
                    className={fieldShellClass}
                  >
                    <option value="">Select shipping terms</option>
                    {shippingTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.code} | {term.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Bank Account</div>
                  <select
                    value={bankAccountId}
                    onChange={(event) => setBankAccountId(event.target.value)}
                    className={fieldShellClass}
                  >
                    <option value="">Select bank account</option>
                    {filteredBankAccounts.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name}
                      </option>
                    ))}
                  </select>

                  {selectedBankAccount ? (
                    <div className="mt-3 text-sm leading-6 text-slate-300">
                      <div className="font-semibold text-white">
                        {selectedBankAccount.beneficiary_name ||
                          selectedBankAccount.name}
                      </div>
                      {selectedBankAccount.bank_name ||
                      selectedBankAccount.institution_name ? (
                        <div>
                          {selectedBankAccount.bank_name ||
                            selectedBankAccount.institution_name}
                        </div>
                      ) : null}
                      {getBankAddress(selectedBankAccount) ? (
                        <div>{getBankAddress(selectedBankAccount)}</div>
                      ) : null}
                      {selectedBankAccount.account_number ||
                      selectedBankAccount.masked_account_number ? (
                        <div>
                          Account:{" "}
                          {selectedBankAccount.account_number ||
                            selectedBankAccount.masked_account_number}
                        </div>
                      ) : null}
                      {getBankIdentifier(selectedBankAccount) ? (
                        <div>
                          {getBankIdentifier(selectedBankAccount)?.label}:{" "}
                          {getBankIdentifier(selectedBankAccount)?.value}
                        </div>
                      ) : null}
                      {selectedBankAccount.currency_code ? (
                        <div>Currency: {selectedBankAccount.currency_code}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Preferred Payment Method</div>
                  <select
                    value={paymentMethodId}
                    onChange={(event) => setPaymentMethodId(event.target.value)}
                    className={fieldShellClass}
                  >
                    <option value="">Select payment method</option>
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Issue Date</div>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                    className={fieldShellClass}
                  />
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Due Date</div>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className={fieldShellClass}
                  />
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Currency</div>
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
                    className={fieldShellClass}
                  >
                    <option value="">Select currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.currency_code} — {currency.currency_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Project</div>
                  <select
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
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
                    value={taskId}
                    onChange={(event) => setTaskId(event.target.value)}
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
  <div className={labelClass}>Source Mode</div>

  <select
    value={sourceMode}
    onChange={(event) => {
      const nextMode = event.target.value as
        | "manual"
        | "proforma_invoice";

      setSourceMode(nextMode);

      if (nextMode === "manual") {
        setSourceProformaId("");
        setSourceProformaInvoice(null);
        setRows([createRow()]);
        setNotes("");
        return;
      }

      // AUTO LOAD FIRST AVAILABLE PI WHEN SWITCHING MODE
      if (proformaSources.length > 0) {
        const first = proformaSources[0];
        setSourceProformaId(first.id);
        void applyProformaSource(first.id);
      }
    }}
    className={fieldShellClass}
  >
    <option value="manual">Manual</option>
    <option value="proforma_invoice">From Proforma Invoice</option>
  </select>

  {sourceMode === "proforma_invoice" && (
    <select
      value={sourceProformaId}
      onChange={(event) => {
        const nextProformaId = event.target.value;

        setSourceProformaId(nextProformaId);

        if (!nextProformaId) return;

        // 🔥 HARD RESET BEFORE APPLY (CRITICAL FIX)
        setRows([]);
        setNotes("");

        void applyProformaSource(nextProformaId);
      }}
      className={fieldShellClass}
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
    </select>
  )}

  <div className="mt-3 text-sm leading-6 text-slate-400">
    {sourceProformaInvoice
      ? `Selected: ${
          sourceProformaInvoice.proforma_number ||
          "Proforma Invoice"
        }`
      : "Manual invoice without proforma source."}
  </div>
</div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-3">
                  <div className={labelClass}>Notes</div>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
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
                        Line Items
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Add products or services using the locked new/create line-item card pattern.
                      </CardDescription>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={addRow}
                  className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Row
                </Button>
              </CardHeader>

              <CardContent className="p-5">
                <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
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

                    const rowBase = Math.max(
                      toNumber(row.quantity) * toNumber(row.unitPrice) -
                        toNumber(row.discount),
                      0
                    );
                    const rowTaxRate = selectedTaxCode?.rate_percent ?? 0;
                    const rowTotal =
                      rowBase + rowBase * (Number(rowTaxRate) / 100);

                    return (
                      <div
                        key={row.localId}
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
                            onClick={() => removeRow(row.localId)}
                            disabled={rows.length === 1}
                            className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                          <label className="space-y-2 md:col-span-3">
                            <div className={inputLabelClass}>Item</div>
                            <select
                              value={row.itemId}
                              onChange={(event) =>
                                applyItemToRow(row.localId, event.target.value)
                              }
                              className={inputFieldClass}
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
                            <div className={inputLabelClass}>Description</div>
                            <input
                              value={row.description}
                              onChange={(event) =>
                                updateRow(
                                  row.localId,
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
                              value={row.quantity}
                              onChange={(event) =>
                                updateRow(
                                  row.localId,
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
                              value={row.unitOfMeasureId}
                              onChange={(event) =>
                                updateRow(
                                  row.localId,
                                  "unitOfMeasureId",
                                  event.target.value
                                )
                              }
                              className={inputFieldClass}
                            >
                              <option value="">Select unit</option>
                              {unitsOfMeasure.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                  {unit.name}
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
                              value={row.unitPrice}
                              onChange={(event) =>
                                updateRow(
                                  row.localId,
                                  "unitPrice",
                                  event.target.value
                                )
                              }
                              className={inputFieldClass}
                            />
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <div className={inputLabelClass}>Discount</div>
                            <input
                              value={row.discount}
                              onChange={(event) =>
                                updateRow(
                                  row.localId,
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
                              value={row.taxCodeId}
                              onChange={(event) =>
                                updateRow(
                                  row.localId,
                                  "taxCodeId",
                                  event.target.value
                                )
                              }
                              className={inputFieldClass}
                            >
                              <option value="">Select tax</option>
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
                              value={row.revenueCategoryId}
                              onChange={(event) =>
                                updateRow(
                                  row.localId,
                                  "revenueCategoryId",
                                  event.target.value
                                )
                              }
                              className={inputFieldClass}
                            >
                              <option value="">Select category</option>
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
                              {formatMoney(rowTotal, currencyCode)}
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
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Invoice Summary
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Live commercial summary before saving.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className={summaryBlockClass}>
                  <div className={labelClass}>Issuing Company</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedCompany?.legal_name || selectedCompany?.name || "—"}
                  </div>
                  {selectedCompany ? (
                    <div className="mt-2 text-sm leading-6 text-slate-400">
                      {getCompanyAddress(selectedCompany) ? (
                        <div>{getCompanyAddress(selectedCompany)}</div>
                      ) : null}
                      {selectedCompany.email ? (
                        <div>Email: {selectedCompany.email}</div>
                      ) : null}
                      {selectedCompany.phone ? (
                        <div>Phone: {selectedCompany.phone}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                                <div className={summaryBlockClass}>
                  <div className={labelClass}>Recipient</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedRecipient.name}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {selectedRecipient.address ? (
                      <div>{selectedRecipient.address}</div>
                    ) : null}
                    {selectedRecipient.email ? (
                      <div>Email: {selectedRecipient.email}</div>
                    ) : null}
                    {selectedRecipient.phone ? (
                      <div>Phone: {selectedRecipient.phone}</div>
                    ) : null}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Payment Terms</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedPaymentTerm?.name || "—"}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {selectedPaymentTerm
                      ? `${selectedPaymentTerm.code} · Due in ${selectedPaymentTerm.due_days} days`
                      : "No payment terms selected"}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Shipping Terms</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedShippingTerm?.name || "—"}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {selectedShippingTerm?.code || "No shipping terms selected"}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Bank Account</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedBankAccount?.name || "—"}
                  </div>
                  {selectedBankAccount ? (
                    <div className="mt-2 text-sm leading-6 text-slate-400">
                      {selectedBankAccount.bank_name ||
                      selectedBankAccount.institution_name ? (
                        <div>
                          {selectedBankAccount.bank_name ||
                            selectedBankAccount.institution_name}
                        </div>
                      ) : null}
                      {getBankAddress(selectedBankAccount) ? (
                        <div>{getBankAddress(selectedBankAccount)}</div>
                      ) : null}
                      {selectedBankAccount.account_number ||
                      selectedBankAccount.masked_account_number ? (
                        <div>
                          Account:{" "}
                          {selectedBankAccount.account_number ||
                            selectedBankAccount.masked_account_number}
                        </div>
                      ) : null}
                      {getBankIdentifier(selectedBankAccount) ? (
                        <div>
                          {getBankIdentifier(selectedBankAccount)?.label}:{" "}
                          {getBankIdentifier(selectedBankAccount)?.value}
                        </div>
                      ) : null}
                      {selectedBankAccount.currency_code ? (
                        <div>Currency: {selectedBankAccount.currency_code}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Preferred Payment Method</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedPaymentMethod?.name || "—"}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {selectedPaymentMethod?.code || "No payment method selected"}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Currency</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedCurrency
                      ? `${selectedCurrency.currency_code} — ${selectedCurrency.currency_name}`
                      : currencyCode || "—"}
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

                <div className={summaryBlockClass}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="font-semibold text-white">
                      {formatMoney(totals.subtotal, currencyCode)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Discount</span>
                    <span className="font-semibold text-white">
                      {formatMoney(totals.discount, currencyCode)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Tax</span>
                    <span className="font-semibold text-white">
                      {formatMoney(totals.tax, currencyCode)}
                    </span>
                  </div>

                  <div className="mt-3 border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">
                        Total
                      </span>
                      <span className="text-lg font-semibold text-white">
                        {formatMoney(totals.total, currencyCode)}
                      </span>
                    </div>
                  </div>
                </div>

                {errorMessage ? (
                  <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {errorMessage}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className={activeSectionClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Locked Behavior
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  New invoice creation rules.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 p-5 text-sm leading-6 text-slate-400">
                <div>• This page creates a draft only.</div>
                <div>• Real invoice number is finalized on issue.</div>
                <div>• Issue action happens later from the detail page.</div>
                <div>• Master data supplies the source values.</div>
                <div>• Invoice snapshot is frozen when issued.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
