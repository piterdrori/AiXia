import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Link2,
  Plus,
  Save,
  SquarePen,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

  const selectedRecipientTitle = useMemo(() => {
    return selectedVendor?.legal_name || selectedVendor?.name || "—";
  }, [selectedVendor]);

  const filteredTasks = useMemo(() => {
    if (!projectId) return tasks;
    return tasks.filter((task) => task.project_id === projectId);
  }, [projectId, tasks]);

  const getCompanyAddress = useCallback((company: CompanyOption | null) => {
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
  }, []);

  const getVendorAddress = useCallback((vendor: VendorOption | null) => {
    if (!vendor) return "";

    return [
      vendor.address_line_1,
      vendor.address_line_2,
      vendor.city,
      vendor.state_province,
      vendor.postal_code,
      vendor.country,
    ]
      .filter(Boolean)
      .join(", ");
  }, []);

  const getVendorBankAddress = useCallback(
    (bank: VendorBankAccountOption | null) => {
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
  }, [sourceVendorQuotationId]);

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
          selected?.purchase_price ?? selected?.unit_price ?? selected?.sales_price ?? 0
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

  const activeSectionClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";

  const summaryBlockClass =
    "rounded-[24px] border border-white/10 bg-black/20 p-4";

  const fieldShellClass =
    "mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30 disabled:opacity-70";

  const inputFieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:opacity-70";

  const labelClass = "text-[11px] uppercase tracking-[0.2em] text-slate-500";

  const inputLabelClass = "text-sm font-medium text-slate-300";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Loading purchase order sources...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/purchase-orders")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Purchase Orders
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    New Purchase Order Draft
                  </Badge>

                  <Badge className="inline-flex w-fit rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200 shadow-none">
                    Supplier Flow
                  </Badge>
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Create Purchase Order Draft
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Build a purchase order from master data or from an accepted
                  vendor quotation. Save it as a draft, then issue and send it
                  later from the purchase order detail page.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-none">
                    Draft only
                  </Badge>
                  <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200 shadow-none">
                    Issue later
                  </Badge>
                  <Badge className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 shadow-none">
                    Reverse procurement
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
                        {selectedRecipientTitle}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
                      <Truck className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    PO recipient selected for this purchase order draft.
                  </p>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Draft Total
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {formatMoney(totals.total, currencyCode || "USD")}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                      <Wallet className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Live value from the draft purchase order line items.
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
                  {formatMoney(totals.subtotal, currencyCode || "USD")}
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
                  {formatMoney(totals.discount, currencyCode || "USD")}
                </div>
                <div className="mt-2 truncate text-sm leading-6 text-slate-400">
                  Draft discount.
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
                  {formatMoney(totals.tax, currencyCode || "USD")}
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
                  {formatMoney(totals.total, currencyCode || "USD")}
                </div>
                <div className="mt-2 truncate text-sm leading-6 text-slate-400">
                  Draft purchase order value.
                </div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        <Card className={activeSectionClass}>
          <CardHeader className="border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200">
                <Link2 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Source Relationship
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Create manually or from one accepted vendor quotation.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
            <div className={summaryBlockClass}>
              <div className={labelClass}>Creation Mode</div>
              <select
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
                className={fieldShellClass}
              >
                <option value="manual">Manual Purchase Order</option>
                <option value="vendor_quotation">From Vendor Quotation</option>
              </select>
            </div>

            <div className={summaryBlockClass}>
              <div className={labelClass}>Accepted Vendor Quotation</div>
              <select
                value={vendorQuotationId}
                onChange={(event) => setVendorQuotationId(event.target.value)}
                disabled={sourceMode !== "vendor_quotation"}
                className={fieldShellClass}
              >
                <option value="">Select accepted quotation</option>
                {vendorQuotations.map((quotation) => (
                  <option key={quotation.id} value={quotation.id}>
                    {quotation.vendor_quotation_number} —{" "}
                    {quotation.vendor_legal_name ||
                      quotation.vendor_name ||
                      "Vendor"}{" "}
                    —{" "}
                    {formatMoney(
                      quotation.total_amount,
                      quotation.currency_code || "USD"
                    )}
                  </option>
                ))}
              </select>
            </div>

            <div className={summaryBlockClass}>
              <div className={labelClass}>Source Status</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {sourceDescription}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-400">
                {selectedVendorQuotation
                  ? `External ref: ${
                      selectedVendorQuotation.external_quotation_number || "—"
                    }`
                  : "Manual purchase order without source quotation."}
              </div>
            </div>

            {selectedVendorQuotation ? (
              <div className="rounded-[24px] border border-violet-400/15 bg-violet-500/10 p-4 md:col-span-3">
                <div className={labelClass}>Source Vendor Quotation</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {selectedVendorQuotation.vendor_quotation_number}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-3 text-sm leading-6 text-slate-300 md:grid-cols-4">
                  <div>
                    <span className="text-slate-500">Vendor:</span>{" "}
                    {selectedVendorQuotation.vendor_legal_name ||
                      selectedVendorQuotation.vendor_name ||
                      "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">Date:</span>{" "}
                    {formatDate(selectedVendorQuotation.quotation_date)}
                  </div>
                  <div>
                    <span className="text-slate-500">Valid Until:</span>{" "}
                    {formatDate(selectedVendorQuotation.valid_until)}
                  </div>
                  <div>
                    <span className="text-slate-500">Lines:</span>{" "}
                    {vendorQuotationLines.length}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

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
                      Issuing company, vendor recipient, vendor bank account,
                      terms, timeline, currency, project, task, and notes.
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
                    disabled={sourceMode === "vendor_quotation"}
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
                  <div className={labelClass}>Vendor / Recipient</div>
                  <select
                    value={vendorId}
                    onChange={(event) => setVendorId(event.target.value)}
                    disabled={sourceMode === "vendor_quotation"}
                    className={fieldShellClass}
                  >
                    <option value="">Select vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.legal_name || vendor.name}
                      </option>
                    ))}
                  </select>

                  {selectedVendor ? (
                    <div className="mt-3 text-sm leading-6 text-slate-300">
                      <div className="font-semibold text-white">
                        {selectedVendor.legal_name || selectedVendor.name}
                      </div>
                      {getVendorAddress(selectedVendor) ? (
                        <div>{getVendorAddress(selectedVendor)}</div>
                      ) : null}
                      {selectedVendor.email ? (
                        <div>Email: {selectedVendor.email}</div>
                      ) : null}
                      {selectedVendor.phone ? (
                        <div>Phone: {selectedVendor.phone}</div>
                      ) : null}
                      {selectedVendor.code ? (
                        <div>Vendor Code: {selectedVendor.code}</div>
                      ) : null}
                      {selectedVendor.contact_person ? (
                        <div>Contact: {selectedVendor.contact_person}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Vendor Bank Account</div>
                  <select
                    value={vendorBankAccountId}
                    onChange={(event) =>
                      setVendorBankAccountId(event.target.value)
                    }
                    disabled={!vendorId}
                    className={fieldShellClass}
                  >
                    <option value="">Select vendor bank account</option>
                    {filteredVendorBankAccounts.map((bank) => {
                      const identifier = getVendorBankIdentifier(bank);

                      return (
                        <option key={bank.id} value={bank.id}>
                          {bank.beneficiary_name ||
                            bank.bank_name ||
                            bank.bank_id}
                          {identifier
                            ? ` — ${identifier.label}: ${identifier.value}`
                            : ""}
                          {bank.currency_code ? ` — ${bank.currency_code}` : ""}
                        </option>
                      );
                    })}
                  </select>

                  {selectedVendorBankAccount ? (
                    <div className="mt-3 text-sm leading-6 text-slate-300">
                      {selectedVendorBankAccount.beneficiary_name ? (
                        <div className="font-semibold text-white">
                          {selectedVendorBankAccount.beneficiary_name}
                        </div>
                      ) : null}
                      {selectedVendorBankAccount.bank_name ? (
                        <div>{selectedVendorBankAccount.bank_name}</div>
                      ) : null}
                      {getVendorBankAddress(selectedVendorBankAccount) ? (
                        <div>
                          {getVendorBankAddress(selectedVendorBankAccount)}
                        </div>
                      ) : null}
                      {selectedVendorBankAccount.account_number ? (
                        <div>
                          Account: {selectedVendorBankAccount.account_number}
                        </div>
                      ) : null}
                      {getVendorBankIdentifier(selectedVendorBankAccount) ? (
                        <div>
                          {
                            getVendorBankIdentifier(selectedVendorBankAccount)
                              ?.label
                          }
                          :{" "}
                          {
                            getVendorBankIdentifier(selectedVendorBankAccount)
                              ?.value
                          }
                        </div>
                      ) : null}
                      {selectedVendorBankAccount.currency_code ? (
                        <div>
                          Currency: {selectedVendorBankAccount.currency_code}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {vendorId && !selectedVendorBankAccount ? (
                    <div className="mt-3 text-sm leading-6 text-slate-400">
                      Select the vendor bank account manually.
                    </div>
                  ) : null}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Payment Terms</div>
                  <select
                    value={paymentTermsId}
                    onChange={(event) => setPaymentTermsId(event.target.value)}
                    disabled={sourceMode === "vendor_quotation"}
                    className={fieldShellClass}
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
                  </select>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Shipping Terms</div>
                  <select
                    value={shippingTermId}
                    onChange={(event) => setShippingTermId(event.target.value)}
                    disabled={sourceMode === "vendor_quotation"}
                    className={fieldShellClass}
                  >
                    <option value="">Select shipping terms</option>
                    {shippingTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.code ? `${term.code} | ` : ""}
                        {term.name}
                      </option>
                    ))}
                  </select>
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
                        {method.code ? `${method.code} | ` : ""}
                        {method.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>PO Date</div>
                  <input
                    type="date"
                    value={poDate}
                    onChange={(event) => setPoDate(event.target.value)}
                    className={fieldShellClass}
                  />
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Expected Delivery Date</div>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(event) =>
                      setExpectedDeliveryDate(event.target.value)
                    }
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
                    disabled={sourceMode === "vendor_quotation"}
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
                    disabled={sourceMode === "vendor_quotation"}
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
                    disabled={sourceMode === "vendor_quotation"}
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

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-3">
                  <div className={labelClass}>Notes</div>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    disabled={sourceMode === "vendor_quotation"}
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:opacity-70"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className={activeSectionClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Line Items
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Each line in this draft purchase order can be added or
                  removed manually.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
                  {lines.map((line, index) => {
                    const selectedItem = items.find(
                      (item) => item.id === line.item_id
                    );
                    const selectedTax = taxCodes.find(
                      (tax) => tax.id === line.tax_code_id
                    );
                    const selectedCategory = expenseCategories.find(
                      (category) => category.id === line.expense_category_id
                    );

                    return (
                      <div
                        key={line.localId}
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

                            {selectedCategory ? (
                              <Badge className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200 shadow-none">
                                {selectedCategory.name}
                              </Badge>
                            ) : null}
                          </div>

                          <Button
                            variant="outline"
                            onClick={() => removeLine(line.localId)}
                            disabled={lines.length === 1}
                            className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                          <label className="space-y-2 md:col-span-3">
                            <div className={inputLabelClass}>Item</div>
                            <select
                              value={line.item_id}
                              onChange={(event) =>
                                handleItemChange(
                                  line.localId,
                                  event.target.value
                                )
                              }
                              disabled={sourceMode === "vendor_quotation"}
                              className={inputFieldClass}
                            >
                              <option value="">Manual item</option>
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
                              value={line.description}
                              onChange={(event) =>
                                updateLine(line.localId, {
                                  description: event.target.value,
                                })
                              }
                              disabled={sourceMode === "vendor_quotation"}
                              placeholder="Description"
                              className={inputFieldClass}
                            />
                          </label>

                          <label className="space-y-2 md:col-span-1">
                            <div className={inputLabelClass}>Qty</div>
                            <input
                              value={line.quantity}
                              onChange={(event) =>
                                updateLine(line.localId, {
                                  quantity: event.target.value,
                                })
                              }
                              disabled={sourceMode === "vendor_quotation"}
                              className={inputFieldClass}
                            />
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <div className={inputLabelClass}>Unit</div>
                            <select
                              value={line.unit_of_measure_id}
                              onChange={(event) =>
                                updateLine(line.localId, {
                                  unit_of_measure_id: event.target.value,
                                })
                              }
                              disabled={sourceMode === "vendor_quotation"}
                              className={inputFieldClass}
                            >
                              <option value="">Select unit</option>
                              {units.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                  {unit.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <div className={inputLabelClass}>Unit Price</div>
                            <input
                              value={line.unit_price}
                              onChange={(event) =>
                                updateLine(line.localId, {
                                  unit_price: event.target.value,
                                })
                              }
                              disabled={sourceMode === "vendor_quotation"}
                              className={inputFieldClass}
                            />
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <div className={inputLabelClass}>Discount</div>
                            <input
                              value={line.discount}
                              onChange={(event) =>
                                updateLine(line.localId, {
                                  discount: event.target.value,
                                })
                              }
                              disabled={sourceMode === "vendor_quotation"}
                              className={inputFieldClass}
                            />
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <div className={inputLabelClass}>Tax Code</div>
                            <select
                              value={line.tax_code_id}
                              onChange={(event) =>
                                updateLine(line.localId, {
                                  tax_code_id: event.target.value,
                                })
                              }
                              disabled={sourceMode === "vendor_quotation"}
                              className={inputFieldClass}
                            >
                              <option value="">Select tax</option>
                              {taxCodes.map((tax) => (
                                <option key={tax.id} value={tax.id}>
                                  {tax.code ? `${tax.code} | ` : ""}
                                  {tax.name} — {toNumber(tax.rate_percent)}%
                                </option>
                              ))}
                            </select>

                            {selectedTax ? (
                              <div className="text-[11px] text-slate-500">
                                {toNumber(selectedTax.rate_percent)}%
                              </div>
                            ) : null}
                          </label>

                                                    <label className="space-y-2 md:col-span-3">
                            <div className={inputLabelClass}>
                              Expense Category
                            </div>
                            <select
                              value={line.expense_category_id}
                              onChange={(event) =>
                                updateLine(line.localId, {
                                  expense_category_id: event.target.value,
                                })
                              }
                              disabled={sourceMode === "vendor_quotation"}
                              className={inputFieldClass}
                            >
                              <option value="">Select category</option>
                              {expenseCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.code ? `${category.code} | ` : ""}
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <div className="space-y-2 md:col-span-3">
                            <div className={inputLabelClass}>Line Total</div>
                            <div className="flex min-h-[44px] items-center rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100">
                              {formatMoney(
                                lineTotals[index] || 0,
                                currencyCode || "USD"
                              )}
                            </div>
                          </div>

                          <label className="space-y-2 md:col-span-12">
                            <div className={inputLabelClass}>Line Notes</div>
                            <input
                              value={line.notes}
                              onChange={(event) =>
                                updateLine(line.localId, {
                                  notes: event.target.value,
                                })
                              }
                              disabled={sourceMode === "vendor_quotation"}
                              placeholder="Optional line notes"
                              className={inputFieldClass}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {sourceMode === "manual" ? (
                  <Button
                    variant="outline"
                    onClick={addLine}
                    className="h-10 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Line
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className={activeSectionClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Purchase Order Summary
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Live supplier-side summary before saving.
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
                  <div className={labelClass}>Vendor / Recipient</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedVendor?.legal_name || selectedVendor?.name || "—"}
                  </div>

                  {selectedVendor ? (
                    <div className="mt-2 text-sm leading-6 text-slate-400">
                      {getVendorAddress(selectedVendor) ? (
                        <div>{getVendorAddress(selectedVendor)}</div>
                      ) : null}
                      {selectedVendor.email ? (
                        <div>Email: {selectedVendor.email}</div>
                      ) : null}
                      {selectedVendor.phone ? (
                        <div>Phone: {selectedVendor.phone}</div>
                      ) : null}
                      {selectedVendor.code ? (
                        <div>Vendor Code: {selectedVendor.code}</div>
                      ) : null}
                      {selectedVendor.contact_person ? (
                        <div>Contact: {selectedVendor.contact_person}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Vendor Bank Account</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedVendorBankAccount?.beneficiary_name ||
                      selectedVendorBankAccount?.bank_name ||
                      "—"}
                  </div>

                  {selectedVendorBankAccount ? (
                    <div className="mt-2 text-sm leading-6 text-slate-400">
                      {selectedVendorBankAccount.bank_name ? (
                        <div>{selectedVendorBankAccount.bank_name}</div>
                      ) : null}
                      {getVendorBankAddress(selectedVendorBankAccount) ? (
                        <div>
                          {getVendorBankAddress(selectedVendorBankAccount)}
                        </div>
                      ) : null}
                      {selectedVendorBankAccount.account_number ? (
                        <div>
                          Account: {selectedVendorBankAccount.account_number}
                        </div>
                      ) : null}
                      {getVendorBankIdentifier(selectedVendorBankAccount) ? (
                        <div>
                          {
                            getVendorBankIdentifier(selectedVendorBankAccount)
                              ?.label
                          }
                          :{" "}
                          {
                            getVendorBankIdentifier(selectedVendorBankAccount)
                              ?.value
                          }
                        </div>
                      ) : null}
                      {selectedVendorBankAccount.currency_code ? (
                        <div>
                          Currency: {selectedVendorBankAccount.currency_code}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {!selectedVendorBankAccount ? (
                    <div className="mt-2 text-sm leading-6 text-slate-400">
                      No vendor bank account selected.
                    </div>
                  ) : null}
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Payment Terms</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedPaymentTerm?.name || "—"}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {selectedPaymentTerm
                      ? `${selectedPaymentTerm.code || "Terms"}${
                          selectedPaymentTerm.due_days !== null &&
                          selectedPaymentTerm.due_days !== undefined
                            ? ` · Due in ${selectedPaymentTerm.due_days} days`
                            : ""
                        }`
                      : "No payment terms selected"}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Shipping Terms</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedShippingTerm?.name || "—"}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {selectedShippingTerm?.code ||
                      "No shipping terms selected"}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Preferred Payment Method</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {selectedPaymentMethod?.name || "—"}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {selectedPaymentMethod?.code ||
                      "No payment method selected"}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Source</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {sourceDescription}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {sourceMode === "vendor_quotation"
                      ? "Accepted vendor quotation source."
                      : "Manual purchase order draft."}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={labelClass}>Timeline</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatDate(poDate)}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    Expected delivery: {formatDate(expectedDeliveryDate)}
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
                      {formatMoney(totals.subtotal, currencyCode || "USD")}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Discount</span>
                    <span className="font-semibold text-white">
                      {formatMoney(totals.discount, currencyCode || "USD")}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Tax</span>
                    <span className="font-semibold text-white">
                      {formatMoney(totals.tax, currencyCode || "USD")}
                    </span>
                  </div>

                  <div className="mt-3 border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">
                        Total
                      </span>
                      <span className="text-lg font-semibold text-white">
                        {formatMoney(totals.total, currencyCode || "USD")}
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
                  New purchase order creation rules.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 p-5 text-sm leading-6 text-slate-400">
                <div>• This page creates a purchase order draft only.</div>
                <div>• PO number and official snapshot are finalized on issue.</div>
                <div>• Issue/send action happens later from the PO detail page.</div>
                <div>• Vendor PI / Invoice is received only after PO issue.</div>
                <div>• Payment Made happens after vendor bill approval.</div>
                <div>• This is the reverse mirror of the incoming receivables flow.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
