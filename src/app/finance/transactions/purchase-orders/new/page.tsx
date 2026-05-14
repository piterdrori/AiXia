import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  Link2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  AixiaAccessRule,
  AixiaActionCard,
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

type VendorOption = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  currency_code: string | null;
  payment_terms_id: string | null;
  country: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
};

type VendorAddressOption = {
  id: string;
  vendor_id: string;
  address_type: string | null;
  country: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  sort_order: number | null;
  is_primary: boolean | null;
  status: string;
};

type VendorPersonnelOption = {
  id: string;
  vendor_id: string;
  full_name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  sort_order: number | null;
  is_primary: boolean | null;
  status: string;
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
  code: string | null;
  name: string;
  due_days: number | null;
  is_default: boolean | null;
};

type ShippingTermOption = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  is_default: boolean | null;
};

type PaymentMethodOption = {
  id: string;
  code: string | null;
  name: string;
};

type VendorBankAccountOption = {
  id: string;
  bank_id: string;
  vendor_id: string;
  vendor_code: string | null;
  beneficiary_name: string | null;
  bank_name: string | null;
  country: string | null;
  city: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  account_number: string | null;
  account_identifier_type: string | null;
  account_identifier_value: string | null;
  currency_code: string | null;
  is_default: boolean;
  status: string;
  notes: string | null;
};

type UnitOption = {
  id: string;
  name: string;
  code: string | null;
};

type TaxCodeOption = {
  id: string;
  code: string | null;
  name: string;
  rate_percent: number | string | null;
};

type ExpenseCategoryOption = {
  id: string;
  code: string | null;
  name: string;
};

type ItemOption = {
  id: string;
  name: string;
  description: string | null;
  sales_price: number | string | null;
  purchase_price: number | string | null;
  unit_price: number | string | null;
  currency_code: string | null;
  unit_of_measure_id: string | null;
  default_unit_of_measure_id: string | null;
  tax_code_id: string | null;
  default_tax_code_id: string | null;
  expense_category_id: string | null;
  revenue_category_id: string | null;
};

type VendorQuotationOption = {
  id: string;
  vendor_quotation_number: string;
  external_quotation_number: string | null;
  vendor_id: string;
  company_id: string | null;
  quotation_date: string;
  valid_until: string | null;
  status: string;
  currency_code: string | null;
  payment_terms_id: string | null;
  shipping_term_id: string | null;
  project_id: string | null;
  task_id: string | null;
  total_amount: number | string | null;
  notes: string | null;
  vendor_name?: string | null;
  vendor_legal_name?: string | null;
};

type VendorQuotationLine = {
  id: string;
  item_id: string | null;
  description: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  discount: number | string | null;
  unit_of_measure_id: string | null;
  tax_code_id: string | null;
  expense_category_id: string | null;
  project_id: string | null;
  task_id: string | null;
  sort_order: number;
  notes: string | null;
};

type PurchaseOrderLineDraft = {
  localId: string;
  item_id: string;
  vendor_quotation_line_item_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount: string;
  unit_of_measure_id: string;
  tax_code_id: string;
  expense_category_id: string;
  project_id: string;
  task_id: string;
  notes: string;
};

function createEmptyLine(): PurchaseOrderLineDraft {
  return {
    localId: crypto.randomUUID(),
    item_id: "",
    vendor_quotation_line_item_id: "",
    description: "",
    quantity: "1",
    unit_price: "0",
    discount: "0",
    unit_of_measure_id: "",
    tax_code_id: "",
    expense_category_id: "",
    project_id: "",
    task_id: "",
    notes: "",
  };
}

function createLineFromVendorQuotation(
  line: VendorQuotationLine
): PurchaseOrderLineDraft {
  return {
    localId: crypto.randomUUID(),
    item_id: line.item_id || "",
    vendor_quotation_line_item_id: line.id,
    description: line.description || "",
    quantity: String(line.quantity ?? "1"),
    unit_price: String(line.unit_price ?? "0"),
    discount: String(line.discount ?? "0"),
    unit_of_measure_id: line.unit_of_measure_id || "",
    tax_code_id: line.tax_code_id || "",
    expense_category_id: line.expense_category_id || "",
    project_id: line.project_id || "",
    task_id: line.task_id || "",
    notes: line.notes || "",
  };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | string | null | undefined, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function joinAddress(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(", ");
}

export default function NewPurchaseOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceVendorQuotationId =
    searchParams.get("vendorQuotationId") ||
    searchParams.get("vendor_quotation_id") ||
    "";

  const [sourceMode, setSourceMode] = useState<"manual" | "vendor_quotation">(
    "manual"
  );
  const [vendorQuotationId, setVendorQuotationId] = useState("");
  const [vendorQuotationLines, setVendorQuotationLines] = useState<
    VendorQuotationLine[]
  >([]);

  const [companyId, setCompanyId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [vendorBankAccountId, setVendorBankAccountId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentTermsId, setPaymentTermsId] = useState("");
  const [shippingTermId, setShippingTermId] = useState("");
  const [poDate, setPoDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseOrderLineDraft[]>([
    createEmptyLine(),
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [vendorBankAccounts, setVendorBankAccounts] = useState<
    VendorBankAccountOption[]
  >([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>(
    []
  );
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermOption[]>([]);
  const [shippingTerms, setShippingTerms] = useState<ShippingTermOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<
    ExpenseCategoryOption[]
  >([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [vendorQuotations, setVendorQuotations] = useState<
    VendorQuotationOption[]
  >([]);

  const filteredVendorBankAccounts = useMemo(() => {
    return vendorBankAccounts.filter((bank) => bank.vendor_id === vendorId);
  }, [vendorBankAccounts, vendorId]);

  const selectedCompany = useMemo(() => {
    return companies.find((company) => company.id === companyId) || null;
  }, [companies, companyId]);

  const selectedVendor = useMemo(() => {
    return vendors.find((vendor) => vendor.id === vendorId) || null;
  }, [vendors, vendorId]);

  const selectedVendorBankAccount = useMemo(() => {
    return (
      filteredVendorBankAccounts.find(
        (bank) => bank.id === vendorBankAccountId
      ) || null
    );
  }, [filteredVendorBankAccounts, vendorBankAccountId]);

  const selectedPaymentTerm = useMemo(() => {
    return paymentTerms.find((term) => term.id === paymentTermsId) || null;
  }, [paymentTerms, paymentTermsId]);

  const selectedShippingTerm = useMemo(() => {
    return shippingTerms.find((term) => term.id === shippingTermId) || null;
  }, [shippingTerms, shippingTermId]);

  const selectedPaymentMethod = useMemo(() => {
    return paymentMethods.find((method) => method.id === paymentMethodId) || null;
  }, [paymentMethods, paymentMethodId]);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === projectId) || null;
  }, [projects, projectId]);

  const selectedTask = useMemo(() => {
    return tasks.find((task) => task.id === taskId) || null;
  }, [tasks, taskId]);

  const selectedCurrency = useMemo(() => {
    return currencies.find((currency) => currency.id === currencyId) || null;
  }, [currencies, currencyId]);

  const selectedVendorQuotation = useMemo(() => {
    return (
      vendorQuotations.find(
        (vendorQuotation) => vendorQuotation.id === vendorQuotationId
      ) || null
    );
  }, [vendorQuotations, vendorQuotationId]);

  const filteredTasks = useMemo(() => {
    if (!projectId) return tasks;
    return tasks.filter((task) => task.project_id === projectId);
  }, [projectId, tasks]);

  const getCompanyAddress = useCallback((company: CompanyOption | null) => {
    if (!company) return "";

    return joinAddress([
      company.address_line_1,
      company.address_line_2,
      company.city,
      company.state_province,
      company.postal_code,
      company.country,
    ]);
  }, []);

  const getVendorAddress = useCallback((vendor: VendorOption | null) => {
    if (!vendor) return "";

    return joinAddress([
      vendor.address_line_1,
      vendor.address_line_2,
      vendor.city,
      vendor.state_province,
      vendor.postal_code,
      vendor.country,
    ]);
  }, []);

  const getVendorBankAddress = useCallback(
    (bank: VendorBankAccountOption | null) => {
      if (!bank) return "";

      return joinAddress([
        bank.address_line_1,
        bank.address_line_2,
        bank.city,
        bank.postal_code,
        bank.country,
      ]);
    },
    []
  );

  const getVendorBankIdentifier = useCallback(
    (bank: VendorBankAccountOption | null) => {
      if (!bank) return null;

      if (
        bank.account_identifier_type === "iban" &&
        bank.account_identifier_value
      ) {
        return {
          label: "IBAN",
          value: bank.account_identifier_value,
        };
      }

      if (
        bank.account_identifier_type === "swift" &&
        bank.account_identifier_value
      ) {
        return {
          label: "SWIFT",
          value: bank.account_identifier_value,
        };
      }

      if (bank.account_identifier_value) {
        return {
          label: "Identifier",
          value: bank.account_identifier_value,
        };
      }

      return null;
    },
    []
  );

  const selectedRecipientTitle = useMemo(() => {
    return selectedVendor?.legal_name || selectedVendor?.name || "—";
  }, [selectedVendor]);

  const sourceDescription = useMemo(() => {
    if (sourceMode === "vendor_quotation") {
      return selectedVendorQuotation
        ? selectedVendorQuotation.vendor_quotation_number
        : "From Vendor Quotation";
    }

    return "Manual Purchase Order";
  }, [selectedVendorQuotation, sourceMode]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce(
      (sum, line) => sum + toNumber(line.quantity) * toNumber(line.unit_price),
      0
    );

    const discount = lines.reduce(
      (sum, line) => sum + toNumber(line.discount),
      0
    );

    const tax = lines.reduce((sum, line) => {
      const taxCode = taxCodes.find((entry) => entry.id === line.tax_code_id);
      const base = Math.max(
        toNumber(line.quantity) * toNumber(line.unit_price) -
          toNumber(line.discount),
        0
      );

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
  }, [lines, taxCodes]);

  const lineTotals = useMemo(() => {
    return lines.map((line) => {
      const taxCode = taxCodes.find((tax) => tax.id === line.tax_code_id);
      const base = Math.max(
        toNumber(line.quantity) * toNumber(line.unit_price) -
          toNumber(line.discount),
        0
      );
      const taxAmount = base * (toNumber(taxCode?.rate_percent) / 100);

      return Math.round((base + taxAmount) * 100) / 100;
    });
  }, [lines, taxCodes]);

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

    try {
      setIsLoading(true);
      setErrorMessage("");

      const [
        vendorsResult,
        vendorAddressesResult,
        vendorPersonnelResult,
        companiesResult,
        projectsResult,
        tasksResult,
        currenciesResult,
        paymentTermsResult,
        shippingTermsResult,
        paymentMethodsResult,
        vendorBankAccountsResult,
        unitsResult,
        taxCodesResult,
        expenseCategoriesResult,
        itemsResult,
        vendorQuotationsResult,
      ] = await Promise.all([
        loadLookup(
          "Vendors",
          supabase
            .from("finance_vendors")
            .select(
              "id, code, name, legal_name, email, phone, contact_person, currency_code, payment_terms_id, country, city, state_province, postal_code, address_line_1, address_line_2"
            )
            .eq("status", "active")
            .order("name", { ascending: true })
        ),
        loadLookup(
          "Vendor addresses",
          supabase
            .from("finance_vendor_addresses")
            .select(
              "id, vendor_id, address_type, country, city, state_province, postal_code, address_line_1, address_line_2, sort_order, is_primary, status"
            )
            .eq("status", "active")
            .order("is_primary", { ascending: false })
            .order("sort_order", { ascending: true })
        ),
        loadLookup(
          "Vendor personnel",
          supabase
            .from("finance_vendor_personnel")
            .select(
              "id, vendor_id, full_name, position, email, phone, sort_order, is_primary, status"
            )
            .eq("status", "active")
            .order("is_primary", { ascending: false })
            .order("sort_order", { ascending: true })
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
          "Payment methods",
          supabase
            .from("finance_payment_methods")
            .select("id, code, name")
            .eq("status", "active")
            .order("name", { ascending: true })
        ),
        loadLookup(
          "Vendor bank accounts",
          supabase
            .from("finance_vendor_bank_accounts")
            .select(
              "id, bank_id, vendor_id, vendor_code, beneficiary_name, bank_name, country, city, postal_code, address_line_1, address_line_2, account_number, account_identifier_type, account_identifier_value, currency_code, is_default, status, notes"
            )
            .eq("status", "active")
            .order("bank_name", { ascending: true })
        ),
        loadLookup(
          "Units of measure",
          supabase
            .from("finance_units_of_measure")
            .select("id, name, code")
            .eq("status", "active")
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
          "Expense categories",
          supabase
            .from("finance_expense_categories")
            .select("id, code, name")
            .eq("status", "active")
            .order("name", { ascending: true })
        ),
        loadLookup(
          "Items",
          supabase
            .from("finance_items")
            .select(
              "id, name, description, sales_price, purchase_price, unit_price, currency_code, unit_of_measure_id, default_unit_of_measure_id, tax_code_id, default_tax_code_id, expense_category_id, revenue_category_id"
            )
            .eq("status", "active")
            .order("name", { ascending: true })
        ),
        loadLookup(
          "Accepted vendor quotations",
          supabase
            .from("finance_vendor_quotations")
            .select(
              [
                "id",
                "vendor_quotation_number",
                "external_quotation_number",
                "vendor_id",
                "company_id",
                "quotation_date",
                "valid_until",
                "status",
                "currency_code",
                "payment_terms_id",
                "shipping_term_id",
                "project_id",
                "task_id",
                "total_amount",
                "notes",
                "finance_vendors(name, legal_name)",
              ].join(", ")
            )
            .eq("status", "accepted")
            .order("updated_at", { ascending: false })
        ),
      ]);

      const vendorAddresses = vendorAddressesResult.data as VendorAddressOption[];
      const vendorPersonnel =
        vendorPersonnelResult.data as VendorPersonnelOption[];

      const getBestVendorAddress = (vendorIdToMatch: string) => {
        const activeAddresses = vendorAddresses.filter(
          (address) =>
            address.vendor_id === vendorIdToMatch &&
            [
              address.address_line_1,
              address.address_line_2,
              address.city,
              address.state_province,
              address.postal_code,
              address.country,
            ].some(Boolean)
        );

        return (
          activeAddresses.find(
            (address) =>
              address.is_primary === true &&
              (address.address_type || "").toLowerCase() === "primary"
          ) ||
          activeAddresses.find((address) => address.is_primary === true) ||
          activeAddresses[0] ||
          null
        );
      };

      const getBestVendorPersonnel = (vendorIdToMatch: string) => {
        const activePersonnel = vendorPersonnel.filter(
          (person) =>
            person.vendor_id === vendorIdToMatch &&
            [person.full_name, person.email, person.phone].some(Boolean)
        );

        return (
          activePersonnel.find((person) => person.is_primary === true) ||
          activePersonnel[0] ||
          null
        );
      };

      const enrichedVendors = (vendorsResult.data as VendorOption[]).map(
        (vendor) => {
          const primaryAddress = getBestVendorAddress(vendor.id);
          const primaryPerson = getBestVendorPersonnel(vendor.id);

          return {
            ...vendor,
            email: vendor.email || primaryPerson?.email || null,
            phone: vendor.phone || primaryPerson?.phone || null,
            contact_person:
              vendor.contact_person || primaryPerson?.full_name || null,
            country: vendor.country || primaryAddress?.country || null,
            city: vendor.city || primaryAddress?.city || null,
            state_province:
              vendor.state_province || primaryAddress?.state_province || null,
            postal_code: vendor.postal_code || primaryAddress?.postal_code || null,
            address_line_1:
              vendor.address_line_1 || primaryAddress?.address_line_1 || null,
            address_line_2:
              vendor.address_line_2 || primaryAddress?.address_line_2 || null,
          };
        }
      );

      const mappedVendorQuotations = vendorQuotationsResult.data.map(
        (record) => {
          const row = record as VendorQuotationOption & {
            finance_vendors?: {
              name?: string | null;
              legal_name?: string | null;
            } | null;
          };

          return {
            ...row,
            vendor_name: row.finance_vendors?.name ?? null,
            vendor_legal_name: row.finance_vendors?.legal_name ?? null,
          };
        }
      );

      setVendors(enrichedVendors);
      setCompanies(companiesResult.data as CompanyOption[]);
      setProjects(projectsResult.data as ProjectOption[]);
      setTasks(tasksResult.data as TaskOption[]);
      setCurrencies(currenciesResult.data as CurrencyOption[]);
      setPaymentTerms(paymentTermsResult.data as PaymentTermOption[]);
      setShippingTerms(shippingTermsResult.data as ShippingTermOption[]);
      setPaymentMethods(paymentMethodsResult.data as PaymentMethodOption[]);
      setVendorBankAccounts(
        vendorBankAccountsResult.data as VendorBankAccountOption[]
      );
      setUnits(unitsResult.data as UnitOption[]);
      setTaxCodes(taxCodesResult.data as TaxCodeOption[]);
      setExpenseCategories(
        expenseCategoriesResult.data as ExpenseCategoryOption[]
      );
      setItems(itemsResult.data as ItemOption[]);
      setVendorQuotations(mappedVendorQuotations);

      if (!companyId && companiesResult.data.length === 1) {
        const onlyCompany = companiesResult.data[0] as CompanyOption;
        setCompanyId(onlyCompany.id);
      }

      const defaultPaymentTerm =
        (paymentTermsResult.data as PaymentTermOption[]).find(
          (term) => term.is_default
        ) ?? (paymentTermsResult.data as PaymentTermOption[])[0];

      if (!paymentTermsId && defaultPaymentTerm) {
        setPaymentTermsId(defaultPaymentTerm.id);
      }

      const defaultShippingTerm =
        (shippingTermsResult.data as ShippingTermOption[]).find(
          (term) => term.is_default
        ) ?? (shippingTermsResult.data as ShippingTermOption[])[0];

      if (!shippingTermId && defaultShippingTerm) {
        setShippingTermId(defaultShippingTerm.id);
      }

      const defaultPaymentMethod =
        (paymentMethodsResult.data as PaymentMethodOption[])[0];

      if (!paymentMethodId && defaultPaymentMethod) {
        setPaymentMethodId(defaultPaymentMethod.id);
      }

      if (sourceVendorQuotationId) {
        setSourceMode("vendor_quotation");
        setVendorQuotationId(sourceVendorQuotationId);
      }

      const lookupErrors = [
        vendorsResult.error,
        vendorAddressesResult.error,
        vendorPersonnelResult.error,
        companiesResult.error,
        projectsResult.error,
        tasksResult.error,
        currenciesResult.error,
        paymentTermsResult.error,
        shippingTermsResult.error,
        paymentMethodsResult.error,
        vendorBankAccountsResult.error,
        unitsResult.error,
        taxCodesResult.error,
        expenseCategoriesResult.error,
        itemsResult.error,
        vendorQuotationsResult.error,
      ].filter(Boolean);

      if (lookupErrors.length > 0) {
        setErrorMessage(lookupErrors.join(" | "));
      }
    } catch (error) {
      console.error("Failed to load purchase order form data:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load purchase order form data."
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    companyId,
    paymentMethodId,
    paymentTermsId,
    shippingTermId,
    sourceVendorQuotationId,
  ]);

  useEffect(() => {
    void loadFormData();
  }, [loadFormData]);

  useEffect(() => {
    if (!selectedVendor) return;

    setCurrencyCode((current) => current || selectedVendor.currency_code || "");
    setPaymentTermsId(
      (current) => current || selectedVendor.payment_terms_id || ""
    );
  }, [selectedVendor]);

  const resetManualSource = useCallback(() => {
    setVendorQuotationId("");
    setVendorQuotationLines([]);
    setLines([createEmptyLine()]);
    setNotes("");
    setErrorMessage("");
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, createEmptyLine()]);
  }, []);

  const removeLine = useCallback((localId: string) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((line) => line.localId !== localId);
    });
  }, []);

  const updateLine = useCallback(
    (localId: string, updates: Partial<PurchaseOrderLineDraft>) => {
      setLines((prev) =>
        prev.map((line) =>
          line.localId === localId ? { ...line, ...updates } : line
        )
      );
    },
    []
  );

  const handleItemChange = useCallback(
    (localId: string, itemId: string) => {
      const selected = items.find((item) => item.id === itemId);

      updateLine(localId, {
        item_id: itemId,
        description: selected?.description || selected?.name || "",
        unit_price: String(
          selected?.purchase_price ??
            selected?.unit_price ??
            selected?.sales_price ??
            0
        ),
        unit_of_measure_id:
          selected?.unit_of_measure_id ||
          selected?.default_unit_of_measure_id ||
          "",
        tax_code_id:
          selected?.tax_code_id || selected?.default_tax_code_id || "",
        expense_category_id:
          selected?.expense_category_id || selected?.revenue_category_id || "",
      });
    },
    [items, updateLine]
  );

  const handleSaveDraft = useCallback(async () => {
    if (!companyId) {
      setErrorMessage("Issuing company is required.");
      return;
    }

    if (!vendorId) {
      setErrorMessage("Vendor must be selected.");
      return;
    }

    if (!vendorBankAccountId) {
      setErrorMessage("Vendor bank account must be selected.");
      return;
    }

    if (!poDate) {
      setErrorMessage("PO date is required.");
      return;
    }

    if (!currencyCode) {
      setErrorMessage("Currency is required.");
      return;
    }

    const validLines = lines.filter(
      (line) => line.description.trim() && toNumber(line.quantity) > 0
    );

    if (validLines.length === 0) {
      setErrorMessage("At least one valid line item is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("User not authenticated.");
      }

      const { data: po, error } = await supabase
        .from("finance_purchase_orders")
        .insert({
          company_id: companyId,
          recipient_type: "vendor",
          vendor_id: vendorId,
          recipient_company_id: null,
          vendor_bank_account_id: vendorBankAccountId,
          payment_method_id: paymentMethodId || null,
          payment_terms_id: paymentTermsId || null,
          shipping_term_id: shippingTermId || null,
          po_date: poDate,
          expected_delivery_date: expectedDeliveryDate || null,
          currency_code: currencyCode || null,
          project_id: projectId || null,
          task_id: taskId || null,
          notes: notes.trim() || null,
          metadata: {
            source:
              sourceMode === "vendor_quotation"
                ? "vendor_quotation_conversion"
                : "manual_purchase_order",
            vendor_quotation_id:
              sourceMode === "vendor_quotation" ? vendorQuotationId || null : null,
            recipient_type: "vendor",
            vendor_id: vendorId,
            recipient_company_id: null,
            vendor_bank_account_id: vendorBankAccountId,
            preferred_payment_method_id: paymentMethodId || null,
            expected_flow:
              "vendor_quotation_to_purchase_order_to_vendor_bill_to_payment_made",
          },
          status: "draft",
          created_by: user.id,
          updated_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      const purchaseOrderId = (po as { id: string }).id;

      const payload = validLines.map((line, index) => ({
        purchase_order_id: purchaseOrderId,
        item_id: line.item_id || null,
        vendor_quotation_line_item_id:
          line.vendor_quotation_line_item_id || null,
        description: line.description.trim(),
        quantity: toNumber(line.quantity),
        unit_price: toNumber(line.unit_price),
        discount: toNumber(line.discount),
        unit_of_measure_id: line.unit_of_measure_id || null,
        tax_code_id: line.tax_code_id || null,
        expense_category_id: line.expense_category_id || null,
        project_id: line.project_id || projectId || null,
        task_id: line.task_id || taskId || null,
        sort_order: index + 1,
        notes: line.notes.trim() || null,
        metadata: {
          source: "new_purchase_order_page",
        },
        created_by: user.id,
        updated_by: user.id,
      }));

      const { error: lineError } = await supabase
        .from("finance_purchase_order_line_items")
        .insert(payload);

      if (lineError) throw lineError;

      navigate(`/finance/transactions/purchase-orders/${purchaseOrderId}`);
    } catch (err) {
      console.error("Failed to save purchase order:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to save purchase order draft."
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    companyId,
    currencyCode,
    expectedDeliveryDate,
    lines,
    navigate,
    notes,
    paymentMethodId,
    paymentTermsId,
    poDate,
    projectId,
    shippingTermId,
    sourceMode,
    taskId,
    vendorBankAccountId,
    vendorId,
    vendorQuotationId,
  ]);

  useEffect(() => {
    if (!vendorId) {
      setVendorBankAccountId("");
      return;
    }

    const selectedBankStillValid = filteredVendorBankAccounts.some(
      (bank) => bank.id === vendorBankAccountId
    );

    if (!selectedBankStillValid) {
      setVendorBankAccountId("");
    }
  }, [filteredVendorBankAccounts, vendorBankAccountId, vendorId]);

  useEffect(() => {
    if (!currencyCode) return;

    const matchedCurrency = currencies.find(
      (currency) => currency.currency_code === currencyCode
    );

    if (matchedCurrency && currencyId !== matchedCurrency.id) {
      setCurrencyId(matchedCurrency.id);
    }
  }, [currencies, currencyCode, currencyId]);

  useEffect(() => {
    if (!projectId) {
      setTaskId("");
      return;
    }

    const taskStillValid = filteredTasks.some((task) => task.id === taskId);

    if (!taskStillValid) {
      setTaskId("");
    }
  }, [filteredTasks, projectId, taskId]);

  useEffect(() => {
    async function applyVendorQuotationSource() {
      if (!selectedVendorQuotation || sourceMode !== "vendor_quotation") return;

      setVendorId(selectedVendorQuotation.vendor_id || "");
      setCompanyId(selectedVendorQuotation.company_id || "");
      setCurrencyCode(selectedVendorQuotation.currency_code || "");
      setPaymentTermsId(selectedVendorQuotation.payment_terms_id || "");
      setShippingTermId(selectedVendorQuotation.shipping_term_id || "");
      setProjectId(selectedVendorQuotation.project_id || "");
      setTaskId(selectedVendorQuotation.task_id || "");
      setVendorBankAccountId("");
      setNotes(selectedVendorQuotation.notes || "");

      const { data, error } = await supabase
        .from("finance_vendor_quotation_line_items")
        .select(
          "id, item_id, description, quantity, unit_price, discount, unit_of_measure_id, tax_code_id, expense_category_id, project_id, task_id, sort_order, notes"
        )
        .eq("vendor_quotation_id", selectedVendorQuotation.id)
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load vendor quotation lines:", error);
        setErrorMessage("Failed to load vendor quotation line items.");
        return;
      }

      const typedLines = (data || []) as unknown as VendorQuotationLine[];

      setVendorQuotationLines(typedLines);
      setLines(
        typedLines.length > 0
          ? typedLines.map(createLineFromVendorQuotation)
          : [createEmptyLine()]
      );
    }

    void applyVendorQuotationSource();
  }, [selectedVendorQuotation, sourceMode]);

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading purchase order sources"
        description="Vendor quotations, companies, vendors, bank accounts, terms, currencies, items, and tax data are loading."
      />
    );
  }

  const currentCurrency = currencyCode || selectedCurrency?.currency_code || "USD";

  const sourceRelationship = (
    <AixiaSection
      title="Source Relationship"
      description="Create manually or from one accepted vendor quotation."
      icon={Link2}
    >
      <AixiaFormGrid columns="three">
        <AixiaFormField>
          <AixiaFieldLabel label="Creation Mode" />
          <AixiaSelectField
            value={sourceMode}
            onChange={(event) => {
              const nextMode = event.target.value as
                | "manual"
                | "vendor_quotation";

              setSourceMode(nextMode);

              if (nextMode === "manual") {
                resetManualSource();
                return;
              }

              setVendorQuotationId("");
              setVendorQuotationLines([]);
              setLines([createEmptyLine()]);
              setNotes("");
              setErrorMessage("");
            }}
          >
            <option value="manual">Manual Purchase Order</option>
            <option value="vendor_quotation">From Vendor Quotation</option>
          </AixiaSelectField>
        </AixiaFormField>

        <AixiaFormField>
          <AixiaFieldLabel label="Accepted Vendor Quotation" />
          <AixiaSelectField
            value={vendorQuotationId}
            onChange={(event) => setVendorQuotationId(event.target.value)}
            disabled={sourceMode !== "vendor_quotation"}
          >
            <option value="">Select accepted quotation</option>
            {vendorQuotations.map((quotation) => (
              <option key={quotation.id} value={quotation.id}>
                {quotation.vendor_quotation_number} —{" "}
                {quotation.vendor_legal_name || quotation.vendor_name || "Vendor"} —{" "}
                {formatMoney(quotation.total_amount, quotation.currency_code || "USD")}
              </option>
            ))}
          </AixiaSelectField>
        </AixiaFormField>

        <AixiaDisplayBlock label="Source Status" value={sourceDescription} />

        {selectedVendorQuotation ? (
          <AixiaFormFullWidth>
            <AixiaActionCard
              label="Source Vendor Quotation"
              value={selectedVendorQuotation.vendor_quotation_number}
              description={[
                selectedVendorQuotation.vendor_legal_name ||
                  selectedVendorQuotation.vendor_name ||
                  "Vendor",
                `External ref: ${
                  selectedVendorQuotation.external_quotation_number || "—"
                }`,
                `Date: ${formatDate(selectedVendorQuotation.quotation_date)}`,
                `Lines: ${vendorQuotationLines.length}`,
              ].join(" · ")}
              icon={Link2}
              tone="violet"
              actionLabel="Open Source Record"
              onClick={() =>
                navigate(
                  `/finance/transactions/vendor-quotations/${selectedVendorQuotation.id}`
                )
              }
            />
          </AixiaFormFullWidth>
        ) : null}
      </AixiaFormGrid>
    </AixiaSection>
  );

  const mainContent = (
    <>
      {sourceRelationship}

      <AixiaSection
        title="Document Overview"
        description="Issuing company, vendor recipient, vendor bank account, terms, timeline, currency, project, task, and notes."
        icon={FileText}
      >
        <AixiaFormGrid columns="three">
          <AixiaFormField>
            <AixiaFieldLabel label="Issuing Company" />
            <AixiaSelectField
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              disabled={sourceMode === "vendor_quotation"}
            >
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.legal_name || company.name}
                </option>
              ))}
            </AixiaSelectField>
            {selectedCompany ? (
              <AixiaDisplayBlock
                label="Company Details"
                value={selectedCompany.legal_name || selectedCompany.name}
                detail={[
                  getCompanyAddress(selectedCompany),
                  selectedCompany.email ? `Email: ${selectedCompany.email}` : "",
                  selectedCompany.phone ? `Phone: ${selectedCompany.phone}` : "",
                ]
                  .filter(Boolean)
                  .join(" • ")}
              />
            ) : null}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Vendor / Recipient" />
            <AixiaSelectField
              value={vendorId}
              onChange={(event) => setVendorId(event.target.value)}
              disabled={sourceMode === "vendor_quotation"}
            >
              <option value="">Select vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.legal_name || vendor.name}
                </option>
              ))}
            </AixiaSelectField>
            {selectedVendor ? (
              <AixiaDisplayBlock
                label="Vendor Details"
                value={selectedVendor.legal_name || selectedVendor.name}
                detail={[
                  getVendorAddress(selectedVendor),
                  selectedVendor.email ? `Email: ${selectedVendor.email}` : "",
                  selectedVendor.phone ? `Phone: ${selectedVendor.phone}` : "",
                  selectedVendor.code ? `Vendor Code: ${selectedVendor.code}` : "",
                  selectedVendor.contact_person
                    ? `Contact: ${selectedVendor.contact_person}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" • ")}
              />
            ) : null}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Vendor Bank Account" />
            <AixiaSelectField
              value={vendorBankAccountId}
              onChange={(event) => setVendorBankAccountId(event.target.value)}
              disabled={!vendorId}
            >
              <option value="">Select vendor bank account</option>
              {filteredVendorBankAccounts.map((bank) => {
                const identifier = getVendorBankIdentifier(bank);

                return (
                  <option key={bank.id} value={bank.id}>
                    {bank.beneficiary_name || bank.bank_name || bank.bank_id}
                    {identifier ? ` — ${identifier.label}: ${identifier.value}` : ""}
                    {bank.currency_code ? ` — ${bank.currency_code}` : ""}
                  </option>
                );
              })}
            </AixiaSelectField>
            {selectedVendorBankAccount ? (
              <AixiaDisplayBlock
                label="Bank Details"
                value={
                  selectedVendorBankAccount.beneficiary_name ||
                  selectedVendorBankAccount.bank_name ||
                  "Vendor Bank"
                }
                detail={[
                  selectedVendorBankAccount.bank_name || "",
                  getVendorBankAddress(selectedVendorBankAccount),
                  selectedVendorBankAccount.account_number
                    ? `Account: ${selectedVendorBankAccount.account_number}`
                    : "",
                  getVendorBankIdentifier(selectedVendorBankAccount)
                    ? `${getVendorBankIdentifier(selectedVendorBankAccount)?.label}: ${
                        getVendorBankIdentifier(selectedVendorBankAccount)?.value
                      }`
                    : "",
                  selectedVendorBankAccount.currency_code
                    ? `Currency: ${selectedVendorBankAccount.currency_code}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" • ")}
              />
            ) : null}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Payment Terms" />
            <AixiaSelectField
              value={paymentTermsId}
              onChange={(event) => setPaymentTermsId(event.target.value)}
              disabled={sourceMode === "vendor_quotation"}
            >
              <option value="">Select terms</option>
              {paymentTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.code ? `${term.code} | ` : ""}
                  {term.name}
                  {term.due_days !== null && term.due_days !== undefined
                    ? ` | Due in ${term.due_days} days`
                    : ""}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Shipping Terms" />
            <AixiaSelectField
              value={shippingTermId}
              onChange={(event) => setShippingTermId(event.target.value)}
              disabled={sourceMode === "vendor_quotation"}
            >
              <option value="">Select shipping terms</option>
              {shippingTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.code ? `${term.code} | ` : ""}
                  {term.name}
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
                  {method.code ? `${method.code} | ` : ""}
                  {method.name}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="PO Date" />
            <AixiaInputField
              type="date"
              value={poDate}
              onChange={(event) => setPoDate(event.target.value)}
            />
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Expected Delivery Date" />
            <AixiaInputField
              type="date"
              value={expectedDeliveryDate}
              onChange={(event) => setExpectedDeliveryDate(event.target.value)}
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
              disabled={sourceMode === "vendor_quotation"}
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
              disabled={sourceMode === "vendor_quotation"}
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
              disabled={sourceMode === "vendor_quotation"}
            >
              <option value="">No task</option>
              {filteredTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormField>

          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Notes" />
            <AixiaTextareaField
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={sourceMode === "vendor_quotation"}
              rows={4}
            />
          </AixiaFormFullWidth>
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Line Items"
        description="Each line in this draft purchase order can be added or removed manually."
        icon={FileText}
        badge={<AixiaBadge tone="cyan">{lines.length} Lines</AixiaBadge>}
        actions={
          sourceMode === "manual" ? (
            <AixiaButton type="button" variant="secondary" onClick={addLine}>
              <Plus className="h-4 w-4" />
              Add Line
            </AixiaButton>
          ) : null
        }
        smartScroll
        itemCount={lines.length}
        visibleCards={10}
      >
        <div className="aixia-stack">
          {lines.map((line, index) => {
            const selectedItem = items.find((item) => item.id === line.item_id);
            const selectedTax = taxCodes.find(
              (tax) => tax.id === line.tax_code_id
            );
            const selectedCategory = expenseCategories.find(
              (category) => category.id === line.expense_category_id
            );

            return (
              <AixiaFormRowCard
                key={line.localId}
                title={`Line ${index + 1}`}
                description={
                  selectedItem?.name ||
                  selectedCategory?.name ||
                  "Purchase order line"
                }
                onRemove={
                  sourceMode === "manual"
                    ? () => removeLine(line.localId)
                    : undefined
                }
                removeLabel={<Trash2 className="h-4 w-4" />}
              >
                <AixiaFormGrid columns="three">
                  <AixiaFormField>
                    <AixiaFieldLabel label="Item" />
                    <AixiaSelectField
                      value={line.item_id}
                      onChange={(event) =>
                        handleItemChange(line.localId, event.target.value)
                      }
                      disabled={sourceMode === "vendor_quotation"}
                    >
                      <option value="">Manual item</option>
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
                        updateLine(line.localId, {
                          description: event.target.value,
                        })
                      }
                      disabled={sourceMode === "vendor_quotation"}
                      placeholder="Description"
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Qty" />
                    <AixiaInputField
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.localId, {
                          quantity: event.target.value,
                        })
                      }
                      disabled={sourceMode === "vendor_quotation"}
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Unit" />
                    <AixiaSelectField
                      value={line.unit_of_measure_id}
                      onChange={(event) =>
                        updateLine(line.localId, {
                          unit_of_measure_id: event.target.value,
                        })
                      }
                      disabled={sourceMode === "vendor_quotation"}
                    >
                      <option value="">Select unit</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Unit Price" />
                    <AixiaInputField
                      value={line.unit_price}
                      onChange={(event) =>
                        updateLine(line.localId, {
                          unit_price: event.target.value,
                        })
                      }
                      disabled={sourceMode === "vendor_quotation"}
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Discount" />
                    <AixiaInputField
                      value={line.discount}
                      onChange={(event) =>
                        updateLine(line.localId, {
                          discount: event.target.value,
                        })
                      }
                      disabled={sourceMode === "vendor_quotation"}
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Tax Code" />
                    <AixiaSelectField
                      value={line.tax_code_id}
                      onChange={(event) =>
                        updateLine(line.localId, {
                          tax_code_id: event.target.value,
                        })
                      }
                      disabled={sourceMode === "vendor_quotation"}
                    >
                      <option value="">Select tax</option>
                      {taxCodes.map((tax) => (
                        <option key={tax.id} value={tax.id}>
                          {tax.code ? `${tax.code} | ` : ""}
                          {tax.name} — {toNumber(tax.rate_percent)}%
                        </option>
                      ))}
                    </AixiaSelectField>
                    {selectedTax ? (
                      <AixiaDisplayBlock
                        label="Tax Rate"
                        value={`${toNumber(selectedTax.rate_percent)}%`}
                      />
                    ) : null}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Expense Category" />
                    <AixiaSelectField
                      value={line.expense_category_id}
                      onChange={(event) =>
                        updateLine(line.localId, {
                          expense_category_id: event.target.value,
                        })
                      }
                      disabled={sourceMode === "vendor_quotation"}
                    >
                      <option value="">Select category</option>
                      {expenseCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.code ? `${category.code} | ` : ""}
                          {category.name}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaDisplayBlock
                    label="Line Total"
                    value={formatMoney(lineTotals[index] || 0, currentCurrency)}
                  />

                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Line Notes" />
                    <AixiaInputField
                      value={line.notes}
                      onChange={(event) =>
                        updateLine(line.localId, {
                          notes: event.target.value,
                        })
                      }
                      disabled={sourceMode === "vendor_quotation"}
                      placeholder="Optional line notes"
                    />
                  </AixiaFormFullWidth>
                </AixiaFormGrid>
              </AixiaFormRowCard>
            );
          })}
        </div>
      </AixiaSection>
    </>
  );

  const sideContent = (
    <>
      <AixiaSection
        title="Purchase Order Summary"
        description="Live supplier-side summary before saving."
        icon={Wallet}
      >
        <AixiaReviewGrid variant="cards">
          <AixiaValueBlock
            label="Issuing Company"
            value={selectedCompany?.legal_name || selectedCompany?.name || "—"}
            detail={
              selectedCompany
                ? [
                    getCompanyAddress(selectedCompany),
                    selectedCompany.email ? `Email: ${selectedCompany.email}` : "",
                    selectedCompany.phone ? `Phone: ${selectedCompany.phone}` : "",
                  ]
                    .filter(Boolean)
                    .join(" • ")
                : "—"
            }
          />
          <AixiaValueBlock
            label="Vendor / Recipient"
            value={selectedVendor?.legal_name || selectedVendor?.name || "—"}
            detail={
              selectedVendor
                ? [
                    getVendorAddress(selectedVendor),
                    selectedVendor.email ? `Email: ${selectedVendor.email}` : "",
                    selectedVendor.phone ? `Phone: ${selectedVendor.phone}` : "",
                    selectedVendor.code ? `Vendor Code: ${selectedVendor.code}` : "",
                    selectedVendor.contact_person
                      ? `Contact: ${selectedVendor.contact_person}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" • ")
                : "—"
            }
          />
          <AixiaValueBlock
            label="Vendor Bank Account"
            value={
              selectedVendorBankAccount?.beneficiary_name ||
              selectedVendorBankAccount?.bank_name ||
              "—"
            }
            detail={
              selectedVendorBankAccount
                ? [
                    selectedVendorBankAccount.bank_name || "",
                    getVendorBankAddress(selectedVendorBankAccount),
                    selectedVendorBankAccount.account_number
                      ? `Account: ${selectedVendorBankAccount.account_number}`
                      : "",
                    getVendorBankIdentifier(selectedVendorBankAccount)
                      ? `${
                          getVendorBankIdentifier(selectedVendorBankAccount)?.label
                        }: ${
                          getVendorBankIdentifier(selectedVendorBankAccount)?.value
                        }`
                      : "",
                    selectedVendorBankAccount.currency_code
                      ? `Currency: ${selectedVendorBankAccount.currency_code}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" • ")
                : "No vendor bank account selected."
            }
          />
          <AixiaValueBlock
            label="Payment Terms"
            value={selectedPaymentTerm?.name || "—"}
            detail={
              selectedPaymentTerm
                ? `${selectedPaymentTerm.code || "Terms"}${
                    selectedPaymentTerm.due_days !== null &&
                    selectedPaymentTerm.due_days !== undefined
                      ? ` · Due in ${selectedPaymentTerm.due_days} days`
                      : ""
                  }`
                : "No payment terms selected."
            }
          />
          <AixiaValueBlock
            label="Shipping Terms"
            value={selectedShippingTerm?.name || "—"}
            detail={selectedShippingTerm?.code || "No shipping terms selected."}
          />
          <AixiaValueBlock
            label="Preferred Payment Method"
            value={selectedPaymentMethod?.name || "—"}
            detail={selectedPaymentMethod?.code || "No payment method selected."}
          />
          <AixiaValueBlock
            label="Source"
            value={sourceDescription}
            detail={
              sourceMode === "vendor_quotation"
                ? "Accepted vendor quotation source."
                : "Manual purchase order draft."
            }
          />
          <AixiaValueBlock
            label="Timeline"
            value={formatDate(poDate)}
            detail={`Expected delivery: ${formatDate(expectedDeliveryDate)}`}
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
            detail={selectedTask?.title || "No task selected."}
          />
          <AixiaValueBlock
            label="Subtotal"
            value={formatMoney(totals.subtotal, currentCurrency)}
          />
          <AixiaValueBlock
            label="Discount"
            value={formatMoney(totals.discount, currentCurrency)}
          />
          <AixiaValueBlock
            label="Tax"
            value={formatMoney(totals.tax, currentCurrency)}
          />
          <AixiaValueBlock
            label="Total"
            value={formatMoney(totals.total, currentCurrency)}
          />
        </AixiaReviewGrid>
      </AixiaSection>

      <AixiaSection
        title="Locked Behavior"
        description="New purchase order creation rules."
        icon={ShieldCheck}
      >
        <AixiaReviewGrid variant="cards">
          <AixiaValueBlock
            label="Draft Only"
            value="Save Draft"
            detail="This page creates a purchase order draft only."
          />
          <AixiaValueBlock
            label="Issue Later"
            value="Detail Page"
            detail="PO number and official snapshot are finalized on issue."
          />
          <AixiaValueBlock
            label="Procurement Flow"
            value="Vendor Quotation → PO → Vendor PI / Invoice → Payment Made"
          />
        </AixiaReviewGrid>
      </AixiaSection>
    </>
  );

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Purchase Orders"
        parentPath="/finance/transactions/purchase-orders"
        badges={[
          { label: "New Purchase Order Draft", tone: "cyan" },
          { label: "Supplier Flow", tone: "amber" },
          { label: "Draft Only", tone: "neutral" },
        ]}
        gradientTitle="Purchase Order"
        title="Create Purchase Order Draft"
        description="Build a purchase order from master data or from an accepted vendor quotation. Save it as a draft, then issue and send it later from the purchase order detail page."
        statusCards={[
          {
            label: "Vendor / Recipient",
            value: selectedRecipientTitle,
            description: "PO recipient selected for this purchase order draft.",
            icon: Truck,
            tone: "amber",
          },
          {
            label: "Draft Total",
            value: formatMoney(totals.total, currentCurrency),
            description: "Live value from the draft purchase order line items.",
            icon: Wallet,
            tone: "emerald",
          },
        ]}
      />

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Subtotal"
          value={formatMoney(totals.subtotal, currentCurrency)}
          description="Before discount and tax."
          icon={FileText}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Discount"
          value={formatMoney(totals.discount, currentCurrency)}
          description="Draft discount."
          icon={Wallet}
          tone="amber"
        />
        <AixiaMetricCard
          label="Tax"
          value={formatMoney(totals.tax, currentCurrency)}
          description="Based on selected tax codes."
          icon={FileText}
          tone="violet"
        />
        <AixiaMetricCard
          label="Total"
          value={formatMoney(totals.total, currentCurrency)}
          description="Draft purchase order value."
          icon={Wallet}
          tone="emerald"
        />
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Locked access rule"
        description="Purchase order creation follows the shared Finance create-page, procurement source, line-item, and draft-save standards."
        icon={ShieldCheck}
      >
        This page uses shared AiXia components for the page shell, hero, metrics,
        source relationship, form controls, line-item cards, summary blocks, and
        action buttons. Page-local UI primitives and local Tailwind visual systems
        are intentionally removed.
      </AixiaAccessRule>

      {errorMessage ? <AixiaAlert tone="error">{errorMessage}</AixiaAlert> : null}

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        sideRebalance="last-to-bottom"
        main={mainContent}
        side={sideContent}
      />

      <AixiaSection
        title="Save Draft"
        description="Create the draft purchase order and continue in the purchase order detail workspace."
        icon={Save}
        actions={
          <AixiaButton
            type="button"
            variant="primary"
            onClick={() => void handleSaveDraft()}
            disabled={isSaving || isLoading}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Draft"}
          </AixiaButton>
        }
      >
        <AixiaEmptyState
          icon={Save}
          title="Ready to save"
          description="Review the source, vendor, bank account, terms, currency, and line items before saving this draft."
        />
      </AixiaSection>
    </AixiaPage>
  );
}
