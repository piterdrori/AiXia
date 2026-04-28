"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
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
  beneficiary_name: string | null;
  iban: string | null;
  swift_code: string | null;
  account_number: string | null;
  currency_code: string | null;
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

    setBankAccountId("");

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
            "id, name, bank_name, beneficiary_name, iban, swift_code, account_number, currency_code, is_default, company_id, country, city, postal_code, address_line_1, address_line_2"
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
        const { data: customerPoData, error: customerPoError } = await supabase
          .from("finance_client_purchase_orders")
          .select(
            "id, client_po_number, external_po_number, quotation_id, proforma_invoice_id, client_id, company_id, po_date, received_at, status, currency_id, currency_code, total_amount, notes, project_id, task_id"
          )
          .eq("id", sourceClientPoId)
          .maybeSingle();

        if (customerPoError) throw customerPoError;

        const typedCustomerPo =
          (customerPoData || null) as CustomerPoSource | null;

        if (!typedCustomerPo) {
          setErrorMessage("Customer PO source was not found.");
        } else if (typedCustomerPo.status !== "received") {
          setErrorMessage(
            "Customer PO must be marked as received before creating a proforma invoice."
          );
        } else if (typedCustomerPo.proforma_invoice_id) {
          navigate(
            `/finance/transactions/proforma-invoices/${typedCustomerPo.proforma_invoice_id}`
          );
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
            bank_name: selectedBankAccount?.bank_name || null,
            beneficiary_name: selectedBankAccount?.beneficiary_name || null,
            bank_address_snapshot: getBankAddress(selectedBankAccount),
            iban: selectedBankAccount?.iban || null,
            swift_code: selectedBankAccount?.swift_code || null,
            account_number: selectedBankAccount?.account_number || null,
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
          preferred_payment_method_id: paymentMethodId || null,
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
            bank_name: selectedBankAccount?.bank_name || null,
            beneficiary_name: selectedBankAccount?.beneficiary_name || null,
            bank_address_snapshot: getBankAddress(selectedBankAccount),
            iban: selectedBankAccount?.iban || null,
            swift_code: selectedBankAccount?.swift_code || null,
            account_number: selectedBankAccount?.account_number || null,
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
            Loading proforma invoice sources...
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
              onClick={() => navigate("/finance/transactions/proforma-invoices")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Proforma Invoices
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    New Proforma Invoice
                  </Badge>

                  {sourceCustomerPo ? (
                    <Badge className="inline-flex w-fit rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                      From Customer PO{" "}
                      {sourceCustomerPo.client_po_number ||
                        sourceCustomerPo.external_po_number}
                    </Badge>
                  ) : null}
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Create Proforma Invoice Draft
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Create a draft proforma invoice from master data or from a
                  customer PO. Sending, acceptance, conversion, archive, and
                  delete actions happen later from the proforma detail workflow.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-none">
                    Draft only
                  </Badge>
                  <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200 shadow-none">
                    Customer PO prefill supported
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
                    Client selected for this proforma invoice draft.
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
                  Draft proforma value.
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
                      Issuing company, client, project references, dates, and currency.
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
                      {selectedBankAccount.bank_name ? (
                        <div>{selectedBankAccount.bank_name}</div>
                      ) : null}
                      {getBankAddress(selectedBankAccount) ? (
                        <div>{getBankAddress(selectedBankAccount)}</div>
                      ) : null}
                      {selectedBankAccount.account_number ? (
                        <div>Account: {selectedBankAccount.account_number}</div>
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
                  <div className={labelClass}>Due / Valid Until</div>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(event) => setValidUntil(event.target.value)}
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
                  <div className={labelClass}>Source Customer PO</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {sourceCustomerPo
                      ? sourceCustomerPo.client_po_number ||
                        sourceCustomerPo.external_po_number ||
                        "Linked"
                      : "Manual"}
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
                  Proforma Summary
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
                  <div className={labelClass}>Client</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedClient?.legal_name || selectedClient?.name || "—"}
                  </div>
                  {selectedClient ? (
                    <div className="mt-2 text-sm leading-6 text-slate-400">
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

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Source Customer PO</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {sourceCustomerPo
                      ? sourceCustomerPo.client_po_number ||
                        sourceCustomerPo.external_po_number ||
                        "Linked"
                      : "Manual"}
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
                      {selectedBankAccount.bank_name ? (
                        <div>{selectedBankAccount.bank_name}</div>
                      ) : null}
                      {getBankAddress(selectedBankAccount) ? (
                        <div>{getBankAddress(selectedBankAccount)}</div>
                      ) : null}
                      {selectedBankAccount.account_number ? (
                        <div>Account: {selectedBankAccount.account_number}</div>
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
                  New proforma creation rules.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 p-5 text-sm leading-6 text-slate-400">
                <div>• This page creates a proforma invoice draft only.</div>
                <div>• Proforma does not affect receivables directly.</div>
                <div>• Send, accept, archive, and convert happen later.</div>
                <div>• Customer PO prefill keeps the source link intact.</div>
                <div>• Conversion to invoice is controlled and explicit.</div>
                <div>• Master data remains the source of truth.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
