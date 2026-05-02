import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Landmark,
  Link2,
  Loader2,
  Plus,
  Receipt,
  Save,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Trash2,
  UploadCloud,
  UserRound,
  Wrench,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type CompanyRow = {
  id: string;
  name: string | null;
};

type EmployeeRefRow = {
  id: string;
  user_id: string;
  code: string | null;
  status: string | null;
  mark: string | null;
  metadata: {
    company?: string | null;
    job_title?: string | null;
    member_type?: string | null;
    source_role?: string | null;
    source_status?: string | null;
  } | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
  member_type: string | null;
};

type ExpenseMadeByType = "employee" | "owner_management" | "company_direct" | "other";
type BillingFrequency = "monthly" | "yearly" | "one_year_upfront" | "other";
type SubscriptionAmountBasis =
  | "monthly_payment"
  | "yearly_payment"
  | "one_year_upfront_payment"
  | "other_subscription_payment";
type SubscriptionPaymentMethod = "not_selected" | "no_card" | "credit_card" | "other";

type CreditCardDraft = {
  id: string;
  nickname: string;
  cardholderName: string;
  brand: string;
  brandOther: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  billingCompany: string;
  notes: string;
};

type FormState = {
  companyId: string;
  expenseMadeByType: ExpenseMadeByType;
  employeeRefId: string;
  responsiblePersonName: string;
  otherMadeByExplanation: string;
  title: string;
  description: string;
  expenseType: string;
  otherExpenseExplanation: string;
  expenseSourceName: string;
  requestedAmount: string;
  currencyCode: string;
  expenseDate: string;
  isRetroactive: boolean;
  retroactiveReason: string;
  externalDocumentationLink: string;
  notes: string;

  officeSupplierType: string;
  officeSupplierTypeOther: string;
  officeLocationType: string;
  officeLocationTypeOther: string;
  officePurchasePurpose: string;

  utilityProviderName: string;
  utilityType: string;
  utilityTypeOther: string;
  utilityPeriodFrom: string;
  utilityPeriodTo: string;
  utilityAccountReference: string;

  onlinePlatform: string;
  onlinePlatformOther: string;
  onlineOrderNumber: string;
  onlineOrderDate: string;
  onlineOrderUrl: string;
  onlineTrackingNumber: string;

  travelType: string;
  travelTypeOther: string;
  travelFrom: string;
  travelTo: string;
  travelDate: string;
  travelReason: string;
  travelRelatedProject: string;

  mealVendorName: string;
  mealType: string;
  mealTypeOther: string;
  mealDate: string;
  mealAttendees: string;
  mealBusinessPurpose: string;

  bankName: string;
  bankFeeType: string;
  bankFeeTypeOther: string;
  bankAccountReference: string;
  bankTransactionReference: string;
  bankFeePeriodFrom: string;
  bankFeePeriodTo: string;

  legalProviderName: string;
  legalServiceType: string;
  legalServiceTypeOther: string;
  legalPeriodFrom: string;
  legalPeriodTo: string;
  legalMatterReference: string;

  governmentAuthorityName: string;
  governmentFeeType: string;
  governmentFeeTypeOther: string;
  governmentReferenceNumber: string;
  governmentDueDate: string;
  governmentPaymentLink: string;

  repairProviderName: string;
  repairServiceType: string;
  repairServiceTypeOther: string;
  repairAssetName: string;
  repairServiceDate: string;
  repairIssueDescription: string;
  repairServiceResult: string;

  companySupportType: string;
  companySupportTypeOther: string;
  companySupportRecipient: string;
  companySupportReason: string;
  companySupportPeriodFrom: string;
  companySupportPeriodTo: string;

  otherExpenseCategory: string;
  otherExpenseCategoryOther: string;

  isSubscriptionExpense: boolean;
  subscriptionProviderName: string;
  subscriptionBillingFrequency: BillingFrequency;
  subscriptionBillingFrequencyOther: string;
  subscriptionAmountBasis: SubscriptionAmountBasis;
  subscriptionAmountBasisOther: string;
  subscriptionStartDate: string;
  subscriptionRenewalDate: string;
  subscriptionAccountReference: string;
  subscriptionAutoCreateFutureExpenses: boolean;
  subscriptionRenewalReminder: boolean;
  subscriptionPaymentMethod: SubscriptionPaymentMethod;
  subscriptionPaymentMethodOther: string;
  subscriptionAdminNotes: string;
  subscriptionCards: CreditCardDraft[];
};

type CachedOptionsPayload = {
  companies: CompanyRow[];
  employees: EmployeeRefRow[];
  profiles: ProfileRow[];
  cachedAt: number;
};

type SelectOption = {
  value: string;
  label: string;
};

const EXPENSE_TYPES: SelectOption[] = [
  { value: "office_support", label: "Office Support" },
  { value: "utilities", label: "Utilities" },
  { value: "software_subscription", label: "Software Subscription" },
  { value: "online_shopping", label: "Online Shopping" },
  { value: "travel", label: "Travel" },
  { value: "meals", label: "Meals" },
  { value: "bank_charges", label: "Bank Charges" },
  { value: "legal_accounting", label: "Legal / Accounting" },
  { value: "government_fee", label: "Government Fee" },
  { value: "repair_service", label: "Repair / Service" },
  { value: "company_support", label: "Company Support" },
  { value: "other", label: "Other" },
];

const OFFICE_SUPPLIER_TYPES: SelectOption[] = [
  { value: "local_shop", label: "Local Shop" },
  { value: "online_vendor", label: "Online Vendor" },
  { value: "office_supplier", label: "Office Supplier" },
  { value: "service_provider", label: "Service Provider" },
  { value: "other", label: "Other" },
];

const OFFICE_LOCATION_TYPES: SelectOption[] = [
  { value: "main_office", label: "Main Office" },
  { value: "factory", label: "Factory" },
  { value: "warehouse", label: "Warehouse" },
  { value: "home_office", label: "Home Office" },
  { value: "other", label: "Other" },
];

const UTILITY_TYPES: SelectOption[] = [
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "internet", label: "Internet" },
  { value: "phone", label: "Phone" },
  { value: "rent_related", label: "Rent Related" },
  { value: "other", label: "Other" },
];

const ONLINE_PLATFORMS: SelectOption[] = [
  { value: "amazon", label: "Amazon" },
  { value: "alibaba", label: "Alibaba" },
  { value: "taobao", label: "Taobao" },
  { value: "jd", label: "JD" },
  { value: "vendor_website", label: "Vendor Website" },
  { value: "other", label: "Other" },
];

const TRAVEL_TYPES: SelectOption[] = [
  { value: "taxi", label: "Taxi" },
  { value: "train", label: "Train" },
  { value: "flight", label: "Flight" },
  { value: "hotel", label: "Hotel" },
  { value: "parking", label: "Parking" },
  { value: "mileage", label: "Mileage" },
  { value: "other", label: "Other" },
];

const MEAL_TYPES: SelectOption[] = [
  { value: "business_meal", label: "Business Meal" },
  { value: "team_meal", label: "Team Meal" },
  { value: "client_meal", label: "Client Meal" },
  { value: "travel_meal", label: "Travel Meal" },
  { value: "other", label: "Other" },
];

const BANK_FEE_TYPES: SelectOption[] = [
  { value: "transfer_fee", label: "Transfer Fee" },
  { value: "account_fee", label: "Account Fee" },
  { value: "wire_fee", label: "Wire Fee" },
  { value: "currency_exchange_fee", label: "Currency Exchange Fee" },
  { value: "card_fee", label: "Card Fee" },
  { value: "other", label: "Other" },
];

const LEGAL_SERVICE_TYPES: SelectOption[] = [
  { value: "legal", label: "Legal" },
  { value: "accounting", label: "Accounting" },
  { value: "audit", label: "Audit" },
  { value: "tax", label: "Tax" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
];

const GOVERNMENT_FEE_TYPES: SelectOption[] = [
  { value: "tax", label: "Tax" },
  { value: "license", label: "License" },
  { value: "registration", label: "Registration" },
  { value: "filing_fee", label: "Filing Fee" },
  { value: "official_service", label: "Official Service" },
  { value: "other", label: "Other" },
];

const REPAIR_SERVICE_TYPES: SelectOption[] = [
  { value: "machine_repair", label: "Machine Repair" },
  { value: "computer_repair", label: "Computer Repair" },
  { value: "office_maintenance", label: "Office Maintenance" },
  { value: "facility_service", label: "Facility Service" },
  { value: "vehicle_service", label: "Vehicle Service" },
  { value: "other", label: "Other" },
];

const COMPANY_SUPPORT_TYPES: SelectOption[] = [
  { value: "employee_support", label: "Employee Support" },
  { value: "department_support", label: "Department Support" },
  { value: "company_internal_support", label: "Company Internal Support" },
  { value: "project_support", label: "Project Support" },
  { value: "other", label: "Other" },
];

const OTHER_EXPENSE_CATEGORIES: SelectOption[] = [
  { value: "temporary_exception", label: "Temporary Exception" },
  { value: "one_time_special_case", label: "One-Time Special Case" },
  { value: "uncategorized_vendor_cost", label: "Uncategorized Vendor Cost" },
  { value: "internal_special_cost", label: "Internal Special Cost" },
  { value: "other", label: "Other" },
];

const BILLING_FREQUENCIES: { value: BillingFrequency; label: string; helper: string }[] = [
  {
    value: "monthly",
    label: "Monthly",
    helper: "Example: ChatGPT at 20 USD every month.",
  },
  {
    value: "yearly",
    label: "Yearly",
    helper: "A yearly subscription charged once every renewal cycle.",
  },
  {
    value: "one_year_upfront",
    label: "One Year Upfront",
    helper: "One payment now that covers the full year.",
  },
  {
    value: "other",
    label: "Other",
    helper: "Use this when the billing cycle is custom.",
  },
];

const SUBSCRIPTION_AMOUNT_BASIS_OPTIONS: {
  value: SubscriptionAmountBasis;
  label: string;
}[] = [
  { value: "monthly_payment", label: "Monthly Payment" },
  { value: "yearly_payment", label: "Yearly Payment" },
  { value: "one_year_upfront_payment", label: "One-Year Upfront Payment" },
  { value: "other_subscription_payment", label: "Other Subscription Payment" },
];

const SUBSCRIPTION_PAYMENT_METHODS: { value: SubscriptionPaymentMethod; label: string }[] = [
  { value: "not_selected", label: "Select Payment Method" },
  { value: "no_card", label: "No Credit Card / Manual Payment" },
  { value: "credit_card", label: "Credit Card On File" },
  { value: "other", label: "Other" },
];

const CARD_BRANDS: SelectOption[] = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "american_express", label: "American Express" },
  { value: "discover", label: "Discover" },
  { value: "unionpay", label: "UnionPay" },
  { value: "other", label: "Other" },
];

const CURRENCY_CODES = ["USD", "EUR", "ILS", "CNY", "HKD", "GBP"];
const OPTIONS_CACHE_KEY = "aixia.finance.expenses.new.options.v2";
const OPTIONS_CACHE_TTL_MS = 1000 * 60 * 5;

const initialSubscriptionCard = (): CreditCardDraft => ({
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `card-${Math.random().toString(36).slice(2)}`,
  nickname: "",
  cardholderName: "",
  brand: "visa",
  brandOther: "",
  last4: "",
  expiryMonth: "",
  expiryYear: "",
  billingCompany: "",
  notes: "",
});

const initialFormState: FormState = {
  companyId: "",
  expenseMadeByType: "employee",
  employeeRefId: "",
  responsiblePersonName: "",
  otherMadeByExplanation: "",
  title: "",
  description: "",
  expenseType: "office_support",
  otherExpenseExplanation: "",
  expenseSourceName: "",
  requestedAmount: "",
  currencyCode: "USD",
  expenseDate: new Date().toISOString().slice(0, 10),
  isRetroactive: false,
  retroactiveReason: "",
  externalDocumentationLink: "",
  notes: "",

  officeSupplierType: "local_shop",
  officeSupplierTypeOther: "",
  officeLocationType: "main_office",
  officeLocationTypeOther: "",
  officePurchasePurpose: "",

  utilityProviderName: "",
  utilityType: "electricity",
  utilityTypeOther: "",
  utilityPeriodFrom: "",
  utilityPeriodTo: "",
  utilityAccountReference: "",

  onlinePlatform: "amazon",
  onlinePlatformOther: "",
  onlineOrderNumber: "",
  onlineOrderDate: "",
  onlineOrderUrl: "",
  onlineTrackingNumber: "",

  travelType: "taxi",
  travelTypeOther: "",
  travelFrom: "",
  travelTo: "",
  travelDate: new Date().toISOString().slice(0, 10),
  travelReason: "",
  travelRelatedProject: "",

  mealVendorName: "",
  mealType: "business_meal",
  mealTypeOther: "",
  mealDate: new Date().toISOString().slice(0, 10),
  mealAttendees: "",
  mealBusinessPurpose: "",

  bankName: "",
  bankFeeType: "transfer_fee",
  bankFeeTypeOther: "",
  bankAccountReference: "",
  bankTransactionReference: "",
  bankFeePeriodFrom: "",
  bankFeePeriodTo: "",

  legalProviderName: "",
  legalServiceType: "legal",
  legalServiceTypeOther: "",
  legalPeriodFrom: "",
  legalPeriodTo: "",
  legalMatterReference: "",

  governmentAuthorityName: "",
  governmentFeeType: "tax",
  governmentFeeTypeOther: "",
  governmentReferenceNumber: "",
  governmentDueDate: "",
  governmentPaymentLink: "",

  repairProviderName: "",
  repairServiceType: "machine_repair",
  repairServiceTypeOther: "",
  repairAssetName: "",
  repairServiceDate: new Date().toISOString().slice(0, 10),
  repairIssueDescription: "",
  repairServiceResult: "",

  companySupportType: "employee_support",
  companySupportTypeOther: "",
  companySupportRecipient: "",
  companySupportReason: "",
  companySupportPeriodFrom: "",
  companySupportPeriodTo: "",

  otherExpenseCategory: "temporary_exception",
  otherExpenseCategoryOther: "",

  isSubscriptionExpense: false,
  subscriptionProviderName: "",
  subscriptionBillingFrequency: "monthly",
  subscriptionBillingFrequencyOther: "",
  subscriptionAmountBasis: "monthly_payment",
  subscriptionAmountBasisOther: "",
  subscriptionStartDate: new Date().toISOString().slice(0, 10),
  subscriptionRenewalDate: "",
  subscriptionAccountReference: "",
  subscriptionAutoCreateFutureExpenses: true,
  subscriptionRenewalReminder: true,
  subscriptionPaymentMethod: "not_selected",
  subscriptionPaymentMethodOther: "",
  subscriptionAdminNotes: "",
  subscriptionCards: [initialSubscriptionCard()],
};

function buildExpenseNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

  return `EXP-${datePart}-${randomPart}`;
}

function resolveMimeType(file: File) {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return file.type || "application/octet-stream";
  }
}

function toAmount(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function formatMoney(currencyCode: string, amount: number) {
  return `${currencyCode} ${
    amount > 0
      ? amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0.00"
  }`;
}

function getOptionLabel(options: SelectOption[], value: string, otherValue?: string) {
  if (value === "other") return otherValue?.trim() || "Other";
  return options.find((option) => option.value === value)?.label || value || "Not selected";
}

function getBillingFrequencyLabel(value: BillingFrequency, otherValue: string) {
  if (value === "other") return otherValue.trim() || "Other";
  return BILLING_FREQUENCIES.find((frequency) => frequency.value === value)?.label || value;
}

function getAmountBasisLabel(value: SubscriptionAmountBasis, otherValue: string) {
  if (value === "other_subscription_payment") return otherValue.trim() || "Other";
  return SUBSCRIPTION_AMOUNT_BASIS_OPTIONS.find((basis) => basis.value === value)?.label || value;
}

function getPaymentMethodLabel(value: SubscriptionPaymentMethod, otherValue: string) {
  if (value === "other") return otherValue.trim() || "Other";
  return SUBSCRIPTION_PAYMENT_METHODS.find((method) => method.value === value)?.label || value;
}

function formatEmployeeLabel(
  employee: EmployeeRefRow,
  profileMap: Map<string, ProfileRow>
) {
  const profile = employee.user_id ? profileMap.get(employee.user_id) : null;

  const employeeName =
    profile?.full_name?.trim() ||
    profile?.display_name?.trim() ||
    profile?.email?.trim() ||
    employee.code?.trim() ||
    "Employee";

  const role =
    profile?.job_title?.trim() ||
    employee.metadata?.job_title?.trim() ||
    employee.metadata?.source_role?.trim() ||
    employee.mark?.trim() ||
    null;

  const company =
    profile?.company?.trim() ||
    employee.metadata?.company?.trim() ||
    null;

  return [employeeName, role, company].filter(Boolean).join(" • ");
}

function inputClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function textareaClass() {
  return "min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
}

function normalizeLast4(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function maskCard(last4: string) {
  const cleanLast4 = normalizeLast4(last4);
  return cleanLast4 ? `•••• •••• •••• ${cleanLast4}` : "Hidden after save";
}

function readOptionsCache(): CachedOptionsPayload | null {
  try {
    const rawPayload = window.sessionStorage.getItem(OPTIONS_CACHE_KEY);
    if (!rawPayload) return null;

    const parsedPayload = JSON.parse(rawPayload) as CachedOptionsPayload;
    const isFresh = Date.now() - parsedPayload.cachedAt < OPTIONS_CACHE_TTL_MS;

    if (!isFresh) return null;

    return parsedPayload;
  } catch {
    return null;
  }
}

function writeOptionsCache(payload: Omit<CachedOptionsPayload, "cachedAt">) {
  try {
    window.sessionStorage.setItem(
      OPTIONS_CACHE_KEY,
      JSON.stringify({
        ...payload,
        cachedAt: Date.now(),
      })
    );
  } catch {
    // Cache is only used to prevent reload flicker. If storage is unavailable, continue normally.
  }
}

function SummaryBlock({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {title}
      </div>
      <div className="mt-2 break-words text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Receipt;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="flex items-start gap-4 border-b border-white/10 px-5 py-4">
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SmallInfoPill({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-200">{value}</div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className={labelClass()}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass()}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function OtherTextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-2">
      <span className={labelClass()}>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass()}
        placeholder={placeholder}
      />
    </label>
  );
}

export default function FinanceNewExpensePage() {
  const navigate = useNavigate();
  const hasMountedRef = useRef(false);

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [documentationFile, setDocumentationFile] = useState<File | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isRefreshingOptions, setIsRefreshingOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const isOnlineShopping = form.expenseType === "online_shopping";
  const isOtherExpenseType = form.expenseType === "other";
  const isSubscriptionType = form.expenseType === "software_subscription";
  const isSubscriptionExpense = isSubscriptionType || form.isSubscriptionExpense;
  const amountValue = toAmount(form.requestedAmount);
  const hasUsableOptions = companies.length > 0 || employees.length > 0;

  const selectedCompany = useMemo(() => {
    return companies.find((company) => company.id === form.companyId) ?? null;
  }, [companies, form.companyId]);

  const selectedEmployee = useMemo(() => {
    return employees.find((employee) => employee.id === form.employeeRefId) ?? null;
  }, [employees, form.employeeRefId]);

  const profileMap = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.user_id, profile]));
  }, [profiles]);

  const selectedEmployeeLabel = selectedEmployee
    ? formatEmployeeLabel(selectedEmployee, profileMap)
    : "";

  const documentationStatus = useMemo(() => {
    if (documentationFile && form.externalDocumentationLink.trim()) return "files_and_links";
    if (documentationFile) return "uploaded";
    if (form.externalDocumentationLink.trim()) return "linked";
    return "missing";
  }, [documentationFile, form.externalDocumentationLink]);

  const subscriptionSummary = useMemo(() => {
    if (!isSubscriptionExpense) return "One-time expense";

    const frequencyLabel = getBillingFrequencyLabel(
      form.subscriptionBillingFrequency,
      form.subscriptionBillingFrequencyOther
    );

    return `${frequencyLabel} • ${formatMoney(form.currencyCode, amountValue)}`;
  }, [
    amountValue,
    form.currencyCode,
    form.subscriptionBillingFrequency,
    form.subscriptionBillingFrequencyOther,
    isSubscriptionExpense,
  ]);

  const sanitizedSubscriptionCards = useMemo(() => {
    return form.subscriptionCards
      .map((card) => ({
        id: card.id,
        nickname: card.nickname.trim(),
        cardholder_name: card.cardholderName.trim(),
        brand: getOptionLabel(CARD_BRANDS, card.brand, card.brandOther),
        brand_key: card.brand,
        brand_other: card.brand === "other" ? card.brandOther.trim() : null,
        last4: normalizeLast4(card.last4),
        masked_number: maskCard(card.last4),
        expiry_month: card.expiryMonth.trim(),
        expiry_year: card.expiryYear.trim(),
        billing_company: card.billingCompany.trim(),
        notes: card.notes.trim(),
        full_card_number_stored: false,
        sensitive_details_hidden: true,
      }))
      .filter((card) => {
        return (
          card.nickname ||
          card.cardholder_name ||
          card.brand ||
          card.last4 ||
          card.expiry_month ||
          card.expiry_year ||
          card.billing_company ||
          card.notes
        );
      });
  }, [form.subscriptionCards]);

  const updateField = useCallback(
    <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
      setForm((current) => ({
        ...current,
        [key]: value,
      }));
      setFormError(null);
      setFormSuccess(null);
    },
    []
  );

  const updateSubscriptionCard = useCallback(
    <Key extends keyof CreditCardDraft>(
      cardId: string,
      key: Key,
      value: CreditCardDraft[Key]
    ) => {
      setForm((current) => ({
        ...current,
        subscriptionCards: current.subscriptionCards.map((card) =>
          card.id === cardId
            ? {
                ...card,
                [key]: key === "last4" ? normalizeLast4(String(value)) : value,
              }
            : card
        ),
      }));
      setFormError(null);
      setFormSuccess(null);
    },
    []
  );

  const addSubscriptionCard = useCallback(() => {
    setForm((current) => ({
      ...current,
      subscriptionPaymentMethod: "credit_card",
      subscriptionCards: [...current.subscriptionCards, initialSubscriptionCard()],
    }));
    setFormError(null);
    setFormSuccess(null);
  }, []);

  const removeSubscriptionCard = useCallback((cardId: string) => {
    setForm((current) => {
      const nextCards = current.subscriptionCards.filter((card) => card.id !== cardId);

      return {
        ...current,
        subscriptionCards: nextCards.length ? nextCards : [initialSubscriptionCard()],
      };
    });
    setFormError(null);
    setFormSuccess(null);
  }, []);

  const applyOptionsPayload = useCallback((payload: Omit<CachedOptionsPayload, "cachedAt">) => {
    setCompanies(payload.companies);
    setEmployees(payload.employees);
    setProfiles(payload.profiles);
  }, []);

  const loadOptions = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      const cachedOptions = mode === "initial" ? readOptionsCache() : null;

      if (cachedOptions) {
        applyOptionsPayload(cachedOptions);
        setIsLoadingOptions(false);
        setIsRefreshingOptions(true);
      } else if (mode === "initial") {
        setIsLoadingOptions(true);
      } else {
        setIsRefreshingOptions(true);
      }

      try {
        const [companiesResult, employeesResult, profilesResult] = await Promise.all([
          supabase.from("finance_companies").select("id, name").order("name"),
          supabase
            .from("finance_employee_refs")
            .select("id, user_id, code, status, mark, metadata")
            .eq("status", "active")
            .order("code"),
          supabase
            .from("profiles")
            .select("user_id, full_name, display_name, email, company, job_title, member_type")
            .order("full_name"),
        ]);

        if (companiesResult.error) throw companiesResult.error;
        if (employeesResult.error) throw employeesResult.error;
        if (profilesResult.error) throw profilesResult.error;

        const nextPayload = {
          companies: (companiesResult.data || []) as CompanyRow[],
          employees: (employeesResult.data || []) as EmployeeRefRow[],
          profiles: (profilesResult.data || []) as ProfileRow[],
        };

        applyOptionsPayload(nextPayload);
        writeOptionsCache(nextPayload);
      } catch (error) {
        console.error("Failed to load expense request options:", error);

        if (!hasUsableOptions) {
          setFormError("Failed to load companies or employees.");
          setCompanies([]);
          setEmployees([]);
          setProfiles([]);
        }
      } finally {
        setIsLoadingOptions(false);
        setIsRefreshingOptions(false);
      }
    },
    [applyOptionsPayload, hasUsableOptions]
  );

  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;

    void loadOptions("initial");

    const refreshInterval = window.setInterval(() => {
      void loadOptions("silent");
    }, 60000);

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [loadOptions]);

  useEffect(() => {
    if (form.expenseType !== "software_subscription") return;

    setForm((current) => {
      if (current.isSubscriptionExpense) return current;

      return {
        ...current,
        isSubscriptionExpense: true,
        subscriptionPaymentMethod:
          current.subscriptionPaymentMethod === "not_selected"
            ? "credit_card"
            : current.subscriptionPaymentMethod,
      };
    });
  }, [form.expenseType]);

  useEffect(() => {
    if (!isSubscriptionExpense) return;

    setForm((current) => {
      let nextAmountBasis = current.subscriptionAmountBasis;

      if (current.subscriptionBillingFrequency === "monthly") {
        nextAmountBasis = "monthly_payment";
      }

      if (current.subscriptionBillingFrequency === "yearly") {
        nextAmountBasis = "yearly_payment";
      }

      if (current.subscriptionBillingFrequency === "one_year_upfront") {
        nextAmountBasis = "one_year_upfront_payment";
      }

      if (nextAmountBasis === current.subscriptionAmountBasis) return current;

      return {
        ...current,
        subscriptionAmountBasis: nextAmountBasis,
      };
    });
  }, [form.subscriptionBillingFrequency, isSubscriptionExpense]);

  const buildExpenseTypeMetadata = useCallback(() => {
    const base = {
      expense_type_key: form.expenseType,
      expense_type_label: getOptionLabel(
        EXPENSE_TYPES,
        form.expenseType,
        form.otherExpenseExplanation
      ),
    };

    if (form.expenseType === "office_support") {
      return {
        ...base,
        office_support: {
          supplier_type: form.officeSupplierType,
          supplier_type_label: getOptionLabel(
            OFFICE_SUPPLIER_TYPES,
            form.officeSupplierType,
            form.officeSupplierTypeOther
          ),
          location_type: form.officeLocationType,
          location_type_label: getOptionLabel(
            OFFICE_LOCATION_TYPES,
            form.officeLocationType,
            form.officeLocationTypeOther
          ),
          purchase_purpose: form.officePurchasePurpose.trim() || null,
        },
      };
    }

    if (form.expenseType === "utilities") {
      return {
        ...base,
        utilities: {
          provider_name: form.utilityProviderName.trim(),
          utility_type: form.utilityType,
          utility_type_label: getOptionLabel(
            UTILITY_TYPES,
            form.utilityType,
            form.utilityTypeOther
          ),
          period_from: form.utilityPeriodFrom || null,
          period_to: form.utilityPeriodTo || null,
          account_reference: form.utilityAccountReference.trim() || null,
        },
      };
    }

    if (form.expenseType === "online_shopping") {
      return {
        ...base,
        online_shopping: {
          platform: getOptionLabel(
            ONLINE_PLATFORMS,
            form.onlinePlatform,
            form.onlinePlatformOther
          ),
          platform_key: form.onlinePlatform,
          platform_other:
            form.onlinePlatform === "other" ? form.onlinePlatformOther.trim() : null,
          order_number: form.onlineOrderNumber.trim(),
          order_date: form.onlineOrderDate || null,
          order_url: form.onlineOrderUrl.trim(),
          tracking_number: form.onlineTrackingNumber.trim(),
        },
      };
    }

    if (form.expenseType === "travel") {
      return {
        ...base,
        travel: {
          travel_type: form.travelType,
          travel_type_label: getOptionLabel(
            TRAVEL_TYPES,
            form.travelType,
            form.travelTypeOther
          ),
          from: form.travelFrom.trim(),
          to: form.travelTo.trim(),
          travel_date: form.travelDate || null,
          reason: form.travelReason.trim(),
          related_project: form.travelRelatedProject.trim() || null,
        },
      };
    }

    if (form.expenseType === "meals") {
      return {
        ...base,
        meals: {
          vendor_name: form.mealVendorName.trim(),
          meal_type: form.mealType,
          meal_type_label: getOptionLabel(MEAL_TYPES, form.mealType, form.mealTypeOther),
          meal_date: form.mealDate || null,
          attendees: form.mealAttendees.trim(),
          business_purpose: form.mealBusinessPurpose.trim(),
        },
      };
    }

    if (form.expenseType === "bank_charges") {
      return {
        ...base,
        bank_charges: {
          bank_name: form.bankName.trim(),
          fee_type: form.bankFeeType,
          fee_type_label: getOptionLabel(
            BANK_FEE_TYPES,
            form.bankFeeType,
            form.bankFeeTypeOther
          ),
          account_reference: form.bankAccountReference.trim() || null,
          transaction_reference: form.bankTransactionReference.trim() || null,
          fee_period_from: form.bankFeePeriodFrom || null,
          fee_period_to: form.bankFeePeriodTo || null,
        },
      };
    }

    if (form.expenseType === "legal_accounting") {
      return {
        ...base,
        legal_accounting: {
          provider_name: form.legalProviderName.trim(),
          service_type: form.legalServiceType,
          service_type_label: getOptionLabel(
            LEGAL_SERVICE_TYPES,
            form.legalServiceType,
            form.legalServiceTypeOther
          ),
          period_from: form.legalPeriodFrom || null,
          period_to: form.legalPeriodTo || null,
          matter_reference: form.legalMatterReference.trim() || null,
        },
      };
    }

    if (form.expenseType === "government_fee") {
      return {
        ...base,
        government_fee: {
          authority_name: form.governmentAuthorityName.trim(),
          fee_type: form.governmentFeeType,
          fee_type_label: getOptionLabel(
            GOVERNMENT_FEE_TYPES,
            form.governmentFeeType,
            form.governmentFeeTypeOther
          ),
          reference_number: form.governmentReferenceNumber.trim() || null,
          due_date: form.governmentDueDate || null,
          payment_link: form.governmentPaymentLink.trim() || null,
        },
      };
    }

    if (form.expenseType === "repair_service") {
      return {
        ...base,
        repair_service: {
          provider_name: form.repairProviderName.trim(),
          service_type: form.repairServiceType,
          service_type_label: getOptionLabel(
            REPAIR_SERVICE_TYPES,
            form.repairServiceType,
            form.repairServiceTypeOther
          ),
          asset_name: form.repairAssetName.trim(),
          service_date: form.repairServiceDate || null,
          issue_description: form.repairIssueDescription.trim(),
          service_result: form.repairServiceResult.trim() || null,
        },
      };
    }

    if (form.expenseType === "company_support") {
      return {
        ...base,
        company_support: {
          support_type: form.companySupportType,
          support_type_label: getOptionLabel(
            COMPANY_SUPPORT_TYPES,
            form.companySupportType,
            form.companySupportTypeOther
          ),
          recipient: form.companySupportRecipient.trim(),
          reason: form.companySupportReason.trim(),
          period_from: form.companySupportPeriodFrom || null,
          period_to: form.companySupportPeriodTo || null,
        },
      };
    }

    if (form.expenseType === "other") {
      return {
        ...base,
        other: {
          category: form.otherExpenseCategory,
          category_label: getOptionLabel(
            OTHER_EXPENSE_CATEGORIES,
            form.otherExpenseCategory,
            form.otherExpenseCategoryOther
          ),
          explanation: form.otherExpenseExplanation.trim(),
        },
      };
    }

    return base;
  }, [form]);

        const validateOtherDropdowns = useCallback(() => {
    if (form.expenseMadeByType === "other" && !form.otherMadeByExplanation.trim()) {
      return "Other explanation is required when Expense Made By is Other.";
    }

    if (form.expenseType === "other" && !form.otherExpenseExplanation.trim()) {
      return "Other Expense Explanation is required when Expense Type is Other.";
    }

    if (form.officeSupplierType === "other" && !form.officeSupplierTypeOther.trim()) {
      return "Write the other office supplier type.";
    }

    if (form.officeLocationType === "other" && !form.officeLocationTypeOther.trim()) {
      return "Write the other office/location type.";
    }

    if (form.utilityType === "other" && !form.utilityTypeOther.trim()) {
      return "Write the other utility type.";
    }

    if (form.onlinePlatform === "other" && !form.onlinePlatformOther.trim()) {
      return "Write the other online platform.";
    }

    if (form.travelType === "other" && !form.travelTypeOther.trim()) {
      return "Write the other travel type.";
    }

    if (form.mealType === "other" && !form.mealTypeOther.trim()) {
      return "Write the other meal type.";
    }

    if (form.bankFeeType === "other" && !form.bankFeeTypeOther.trim()) {
      return "Write the other bank charge type.";
    }

    if (form.legalServiceType === "other" && !form.legalServiceTypeOther.trim()) {
      return "Write the other legal/accounting service type.";
    }

    if (form.governmentFeeType === "other" && !form.governmentFeeTypeOther.trim()) {
      return "Write the other government fee type.";
    }

    if (form.repairServiceType === "other" && !form.repairServiceTypeOther.trim()) {
      return "Write the other repair/service type.";
    }

    if (form.companySupportType === "other" && !form.companySupportTypeOther.trim()) {
      return "Write the other company support type.";
    }

    if (form.otherExpenseCategory === "other" && !form.otherExpenseCategoryOther.trim()) {
      return "Write the other expense category.";
    }

    if (
      isSubscriptionExpense &&
      form.subscriptionBillingFrequency === "other" &&
      !form.subscriptionBillingFrequencyOther.trim()
    ) {
      return "Write the other subscription billing frequency.";
    }

    if (
      isSubscriptionExpense &&
      form.subscriptionAmountBasis === "other_subscription_payment" &&
      !form.subscriptionAmountBasisOther.trim()
    ) {
      return "Write the other subscription amount basis.";
    }

    if (
      isSubscriptionExpense &&
      form.subscriptionPaymentMethod === "other" &&
      !form.subscriptionPaymentMethodOther.trim()
    ) {
      return "Write the other subscription payment method.";
    }

    if (
      isSubscriptionExpense &&
      form.subscriptionPaymentMethod === "credit_card" &&
      form.subscriptionCards.some((card) => card.brand === "other" && !card.brandOther.trim())
    ) {
      return "Write the other credit card brand.";
    }

    return null;
  }, [form, isSubscriptionExpense]);

  const validateExpenseTypeFields = useCallback(() => {
    if (form.expenseType === "office_support") {
      if (!form.officePurchasePurpose.trim()) return "Purchase purpose is required.";
    }

    if (form.expenseType === "utilities") {
      if (!form.utilityProviderName.trim()) return "Utility provider is required.";
      if (!form.utilityPeriodFrom) return "Utility period from date is required.";
      if (!form.utilityPeriodTo) return "Utility period to date is required.";
    }

    if (form.expenseType === "online_shopping") {
      if (!form.onlinePlatform.trim()) return "Online platform is required.";
      if (!form.onlineOrderUrl.trim() && !form.onlineOrderNumber.trim()) {
        return "Online shopping needs an order URL or order number.";
      }
    }

    if (form.expenseType === "travel") {
      if (!form.travelFrom.trim()) return "Travel From is required.";
      if (!form.travelTo.trim()) return "Travel To is required.";
      if (!form.travelDate) return "Travel date is required.";
      if (!form.travelReason.trim()) return "Travel reason is required.";
    }

    if (form.expenseType === "meals") {
      if (!form.mealVendorName.trim()) return "Restaurant / vendor name is required.";
      if (!form.mealDate) return "Meal date is required.";
      if (!form.mealAttendees.trim()) return "Meal attendees are required.";
      if (!form.mealBusinessPurpose.trim()) return "Meal business purpose is required.";
    }

    if (form.expenseType === "bank_charges") {
      if (!form.bankName.trim()) return "Bank name is required.";
      if (!form.bankTransactionReference.trim() && !form.bankAccountReference.trim()) {
        return "Bank charge needs an account reference or transaction reference.";
      }
    }

    if (form.expenseType === "legal_accounting") {
      if (!form.legalProviderName.trim()) return "Legal / accounting provider is required.";
      if (!form.legalPeriodFrom) return "Service period from date is required.";
      if (!form.legalPeriodTo) return "Service period to date is required.";
    }

    if (form.expenseType === "government_fee") {
      if (!form.governmentAuthorityName.trim()) return "Government authority is required.";
      if (!form.governmentReferenceNumber.trim()) return "Government reference number is required.";
    }

    if (form.expenseType === "repair_service") {
      if (!form.repairProviderName.trim()) return "Repair / service provider is required.";
      if (!form.repairAssetName.trim()) return "Asset / equipment is required.";
      if (!form.repairServiceDate) return "Repair / service date is required.";
      if (!form.repairIssueDescription.trim()) return "Issue description is required.";
    }

    if (form.expenseType === "company_support") {
      if (!form.companySupportRecipient.trim()) return "Receiving person / company is required.";
      if (!form.companySupportReason.trim()) return "Company support reason is required.";
    }

    return null;
  }, [form]);

  const validateForm = useCallback(
    (submitMode: "draft" | "request") => {
      if (!form.title.trim()) return "Expense title is required.";
      if (!form.companyId) return "Company is required.";
      if (!form.expenseDate) return "Expected expense date is required.";
      if (!form.expenseType) return "Expense type is required.";
      if (!form.expenseSourceName.trim()) return "Expense Source is required.";
      if (amountValue <= 0) return "Requested amount must be greater than zero.";

      if (form.expenseMadeByType === "employee" && !form.employeeRefId) {
        return "Employee is required when Expense Made By is Employee.";
      }

      if (
        form.expenseMadeByType === "owner_management" &&
        !form.responsiblePersonName.trim()
      ) {
        return "Responsible person name is required for Owner / Management expenses.";
      }

      const otherValidationError = validateOtherDropdowns();
      if (otherValidationError) return otherValidationError;

      const expenseTypeValidationError = validateExpenseTypeFields();
      if (expenseTypeValidationError) return expenseTypeValidationError;

      if (form.isRetroactive && !form.retroactiveReason.trim()) {
        return "Retroactive reason is required.";
      }

      if (isSubscriptionExpense) {
        if (!form.subscriptionProviderName.trim()) {
          return "Provider / service name is required for subscription expenses.";
        }

        if (!form.subscriptionStartDate) {
          return "Subscription start date is required.";
        }

        if (!form.subscriptionBillingFrequency) {
          return "Billing frequency is required.";
        }

        if (form.subscriptionPaymentMethod === "not_selected") {
          return "Choose whether this subscription uses a credit card.";
        }

        if (
          form.subscriptionPaymentMethod === "credit_card" &&
          sanitizedSubscriptionCards.length === 0
        ) {
          return "Add at least one masked credit card for this subscription or choose No Card.";
        }

        if (
          form.subscriptionPaymentMethod === "credit_card" &&
          sanitizedSubscriptionCards.some((card) => card.last4.length !== 4)
        ) {
          return "Every subscription card must include exactly the last 4 digits only.";
        }

        if (
          form.subscriptionPaymentMethod === "credit_card" &&
          sanitizedSubscriptionCards.some((card) => !card.nickname)
        ) {
          return "Every subscription card needs a nickname so Finance/Admin can identify it later.";
        }
      }

      if (submitMode === "request" && documentationStatus === "missing" && form.isRetroactive) {
        return "Retroactive requests need documentation upload or documentation link.";
      }

      return null;
    },
    [
      amountValue,
      documentationStatus,
      form,
      isSubscriptionExpense,
      sanitizedSubscriptionCards,
      validateExpenseTypeFields,
      validateOtherDropdowns,
    ]
  );

  const uploadDocumentation = useCallback(
    async (expenseId: string, expenseNumber: string, userId: string | null) => {
      if (!documentationFile) return;

      const resolvedMimeType = resolveMimeType(documentationFile);
      const safeFileName = documentationFile.name.replace(/[^\w.\-]+/g, "_");
      const filePath = `${expenseId}/${Date.now()}-${safeFileName}`;

      const uploadResult = await supabase.storage
        .from("finance-expense-documents")
        .upload(filePath, documentationFile, {
          contentType: resolvedMimeType,
          upsert: false,
        });

      if (uploadResult.error) throw uploadResult.error;

      const fileUploadResult = await supabase
        .from("file_uploads")
        .insert({
          user_id: userId,
          file_name: documentationFile.name,
          file_path: uploadResult.data.path,
          file_size: documentationFile.size,
          mime_type: resolvedMimeType,
          entity_type: "finance_expense",
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (fileUploadResult.error) throw fileUploadResult.error;

      const attachmentResult = await supabase.from("finance_record_attachments").insert({
        entity_type: "finance_expense",
        entity_id: expenseId,
        file_upload_id: fileUploadResult.data.id,
        uploaded_by: userId,
        notes: `Documentation for ${expenseNumber}`,
        metadata: {
          bucket: "finance-expense-documents",
          uploaded_from: "expenses_new_request",
          resolved_mime_type: resolvedMimeType,
        },
      });

      if (attachmentResult.error) throw attachmentResult.error;
    },
    [documentationFile]
  );

  const saveExpense = useCallback(
    async (submitMode: "draft" | "request") => {
      setIsSaving(true);
      setFormError(null);
      setFormSuccess(null);

      try {
        const validationError = validateForm(submitMode);
        if (validationError) {
          setFormError(validationError);
          return;
        }

        const authResult = await supabase.auth.getUser();
        if (authResult.error) throw authResult.error;

        const userId = authResult.data.user?.id ?? null;
        const expenseNumber = buildExpenseNumber();
        const requestStatus = submitMode === "request" ? "requested" : "draft";
        const expenseTypeDetails = buildExpenseTypeMetadata();

        const subscriptionMetadata = isSubscriptionExpense
          ? {
              is_subscription: true,
              admin_only_option: true,
              permission_enforcement_pending: true,
              provider_name: form.subscriptionProviderName.trim(),
              billing_frequency: form.subscriptionBillingFrequency,
              billing_frequency_label: getBillingFrequencyLabel(
                form.subscriptionBillingFrequency,
                form.subscriptionBillingFrequencyOther
              ),
              billing_frequency_other:
                form.subscriptionBillingFrequency === "other"
                  ? form.subscriptionBillingFrequencyOther.trim()
                  : null,
              account_reference: form.subscriptionAccountReference.trim() || null,
              start_date: form.subscriptionStartDate || null,
              end_date: form.subscriptionRenewalDate || null,
              renewal_date: form.subscriptionRenewalDate || null,
              renewal_reminder: form.subscriptionRenewalReminder,
              auto_create_future_expenses:
                form.subscriptionAutoCreateFutureExpenses,
              automatic_generation_status: form.subscriptionAutoCreateFutureExpenses
                ? "metadata_ready_scheduler_required"
                : "manual_only",
              amount_basis: form.subscriptionAmountBasis,
              amount_basis_label: getAmountBasisLabel(
                form.subscriptionAmountBasis,
                form.subscriptionAmountBasisOther
              ),
              amount_basis_other:
                form.subscriptionAmountBasis === "other_subscription_payment"
                  ? form.subscriptionAmountBasisOther.trim()
                  : null,
              amount: amountValue,
              currency_code: form.currencyCode.trim().toUpperCase(),
              next_expected_expense_date: form.subscriptionRenewalDate || null,
              payment_method: form.subscriptionPaymentMethod,
              payment_method_label: getPaymentMethodLabel(
                form.subscriptionPaymentMethod,
                form.subscriptionPaymentMethodOther
              ),
              payment_method_other:
                form.subscriptionPaymentMethod === "other"
                  ? form.subscriptionPaymentMethodOther.trim()
                  : null,
              cards:
                form.subscriptionPaymentMethod === "credit_card"
                  ? sanitizedSubscriptionCards
                  : [],
              card_details_hidden_after_save: true,
              sensitive_card_data_stored: false,
              admin_notes: form.subscriptionAdminNotes.trim() || null,
            }
          : null;

        const metadata = {
          expense_type_details: expenseTypeDetails,
          online_shopping:
            form.expenseType === "online_shopping"
              ? expenseTypeDetails.online_shopping
              : null,
          subscription: subscriptionMetadata,
          credit_card:
            isSubscriptionExpense && form.subscriptionPaymentMethod === "credit_card"
              ? {
                  admin_only_option: true,
                  permission_enforcement_pending: true,
                  cards: sanitizedSubscriptionCards,
                  display_rule:
                    "Show masked card only. Never expose full card number in requester views.",
                  editable_by: "admin_later_permission_gate",
                  sensitive_card_data_stored: false,
                }
              : null,
          admin_subscription_context: isSubscriptionExpense
            ? {
                created_from: "expenses_new_request",
                future_expense_generation:
                  "metadata_only_until_backend_scheduler_is_added",
                requested_behavior:
                  "Create monthly/yearly subscription expense records automatically after backend scheduler is implemented.",
              }
            : null,
          documentation_link: form.externalDocumentationLink.trim() || null,
          selected_company_name: selectedCompany?.name ?? null,
          selected_employee_code: selectedEmployee?.code ?? null,
          selected_employee_name: selectedEmployeeLabel || null,
          intake_context: "expenses_tab_public_request",
        };

        const insertResult = await supabase
          .from("finance_expenses")
          .insert({
            expense_number: expenseNumber,
            title: form.title.trim(),
            description: form.description.trim() || null,
            amount: amountValue,
            requested_amount: amountValue,
            final_amount: amountValue,
            expense_date: form.expenseDate,
            expense_type: form.expenseType,
            currency_code: form.currencyCode.trim().toUpperCase(),
            company_id: form.companyId,
            employee_ref_id:
              form.expenseMadeByType === "employee" ? form.employeeRefId : null,
            expense_made_by_type: form.expenseMadeByType,
            responsible_person_name:
              form.expenseMadeByType === "owner_management"
                ? form.responsiblePersonName.trim()
                : null,
            other_made_by_explanation:
              form.expenseMadeByType === "other"
                ? form.otherMadeByExplanation.trim()
                : null,
            expense_source_name: form.expenseSourceName.trim(),
            other_expense_explanation: isOtherExpenseType
              ? form.otherExpenseExplanation.trim()
              : null,
            is_retroactive: form.isRetroactive,
            retroactive_reason: form.isRetroactive ? form.retroactiveReason.trim() : null,
            request_status: requestStatus,
            status: submitMode === "request" ? "submitted" : "draft",
            approval_status: submitMode === "request" ? "pending" : "not_required",
            payment_status: "not_applicable",
            documentation_status: documentationStatus,
            finance_review_status: "pending_review",
            funding_status: "not_allocated",
            coverage_status: "not_covered",
            recipient_confirmation_status: "not_paid_yet",
            online_platform:
              form.expenseType === "online_shopping"
                ? getOptionLabel(
                    ONLINE_PLATFORMS,
                    form.onlinePlatform,
                    form.onlinePlatformOther
                  )
                : null,
            online_order_number:
              form.expenseType === "online_shopping"
                ? form.onlineOrderNumber.trim() || null
                : null,
            online_order_date:
              form.expenseType === "online_shopping" && form.onlineOrderDate
                ? form.onlineOrderDate
                : null,
            online_order_url:
              form.expenseType === "online_shopping"
                ? form.onlineOrderUrl.trim() || null
                : null,
            online_tracking_number:
              form.expenseType === "online_shopping"
                ? form.onlineTrackingNumber.trim() || null
                : null,
            online_confirmation_status:
              form.expenseType === "online_shopping" ? "not_confirmed" : "not_applicable",
            notes: form.notes.trim() || null,
            metadata,
            submitter_user_id: userId,
            created_by: userId,
            updated_by: userId,
          })
          .select("id, expense_number")
          .single();

        if (insertResult.error) throw insertResult.error;

        await uploadDocumentation(
          insertResult.data.id,
          insertResult.data.expense_number,
          userId
        );

        setFormSuccess(
          submitMode === "request"
            ? "Expense request submitted for Finance review."
            : "Expense draft saved."
        );

        navigate(`/finance/transactions/expenses/${insertResult.data.id}`);
      } catch (error) {
        console.error("Failed to save expense request:", error);
        setFormError(
          error instanceof Error ? error.message : "Failed to save expense request."
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      amountValue,
      buildExpenseTypeMetadata,
      documentationStatus,
      form,
      isOtherExpenseType,
      isSubscriptionExpense,
      navigate,
      sanitizedSubscriptionCards,
      selectedCompany?.name,
      selectedEmployee?.code,
      selectedEmployeeLabel,
      uploadDocumentation,
      validateForm,
    ]
  );

  const renderDynamicExpenseSection = () => {
    if (form.expenseType === "office_support") {
      return (
        <SectionCard
          title="Office Support Details"
          description="Define the office support context and purchase purpose."
          icon={Building2}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Supplier / Shop Type"
              value={form.officeSupplierType}
              onChange={(value) => updateField("officeSupplierType", value)}
              options={OFFICE_SUPPLIER_TYPES}
            />
            {form.officeSupplierType === "other" ? (
              <OtherTextField
                label="Write Other Supplier / Shop Type"
                value={form.officeSupplierTypeOther}
                onChange={(value) => updateField("officeSupplierTypeOther", value)}
                placeholder="Write the supplier/shop type"
              />
            ) : null}

            <SelectField
              label="Office / Location"
              value={form.officeLocationType}
              onChange={(value) => updateField("officeLocationType", value)}
              options={OFFICE_LOCATION_TYPES}
            />
            {form.officeLocationType === "other" ? (
              <OtherTextField
                label="Write Other Office / Location"
                value={form.officeLocationTypeOther}
                onChange={(value) => updateField("officeLocationTypeOther", value)}
                placeholder="Write the location"
              />
            ) : null}

            <label className="grid gap-2 md:col-span-2">
              <span className={labelClass()}>Purchase Purpose</span>
              <textarea
                value={form.officePurchasePurpose}
                onChange={(event) => updateField("officePurchasePurpose", event.target.value)}
                className={textareaClass()}
                placeholder="Explain what was purchased and why the office needs it"
              />
            </label>
          </div>
        </SectionCard>
      );
    }

    if (form.expenseType === "utilities") {
      return (
        <SectionCard
          title="Utility Bill Details"
          description="Capture utility provider, bill period, and account reference."
          icon={Receipt}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className={labelClass()}>Utility Provider</span>
              <input
                value={form.utilityProviderName}
                onChange={(event) => updateField("utilityProviderName", event.target.value)}
                className={inputClass()}
                placeholder="Provider name"
              />
            </label>

            <SelectField
              label="Utility Type"
              value={form.utilityType}
              onChange={(value) => updateField("utilityType", value)}
              options={UTILITY_TYPES}
            />
            {form.utilityType === "other" ? (
              <OtherTextField
                label="Write Other Utility Type"
                value={form.utilityTypeOther}
                onChange={(value) => updateField("utilityTypeOther", value)}
                placeholder="Write the utility type"
              />
            ) : null}

            <label className="grid gap-2">
              <span className={labelClass()}>Bill Period From</span>
              <input
                type="date"
                value={form.utilityPeriodFrom}
                onChange={(event) => updateField("utilityPeriodFrom", event.target.value)}
                className={inputClass()}
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Bill Period To</span>
              <input
                type="date"
                value={form.utilityPeriodTo}
                onChange={(event) => updateField("utilityPeriodTo", event.target.value)}
                className={inputClass()}
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className={labelClass()}>Account / Contract Number</span>
              <input
                value={form.utilityAccountReference}
                onChange={(event) =>
                  updateField("utilityAccountReference", event.target.value)
                }
                className={inputClass()}
                placeholder="Account number, contract number, or bill reference"
              />
            </label>
          </div>
        </SectionCard>
      );
    }

    if (form.expenseType === "online_shopping") {
      return (
        <SectionCard
          title="Online Shopping Confirmation"
          description="Capture order details, platform, link, and tracking information."
          icon={ShoppingCart}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Online Platform"
              value={form.onlinePlatform}
              onChange={(value) => updateField("onlinePlatform", value)}
              options={ONLINE_PLATFORMS}
            />
            {form.onlinePlatform === "other" ? (
              <OtherTextField
                label="Write Other Online Platform"
                value={form.onlinePlatformOther}
                onChange={(value) => updateField("onlinePlatformOther", value)}
                placeholder="Write the online platform"
              />
            ) : null}

            <label className="grid gap-2">
              <span className={labelClass()}>Order Number</span>
              <input
                value={form.onlineOrderNumber}
                onChange={(event) => updateField("onlineOrderNumber", event.target.value)}
                className={inputClass()}
                placeholder="Order number"
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Order Date</span>
              <input
                type="date"
                value={form.onlineOrderDate}
                onChange={(event) => updateField("onlineOrderDate", event.target.value)}
                className={inputClass()}
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Tracking Number</span>
              <input
                value={form.onlineTrackingNumber}
                onChange={(event) =>
                  updateField("onlineTrackingNumber", event.target.value)
                }
                className={inputClass()}
                placeholder="Tracking number if available"
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className={labelClass()}>Order URL</span>
              <input
                value={form.onlineOrderUrl}
                onChange={(event) => updateField("onlineOrderUrl", event.target.value)}
                className={inputClass()}
                placeholder="Online order link"
              />
            </label>
          </div>
        </SectionCard>
      );
    }

    if (form.expenseType === "travel") {
      return (
        <SectionCard
          title="Travel Details"
          description="Capture from/to, travel type, reason, and related context."
          icon={CalendarClock}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Travel Type"
              value={form.travelType}
              onChange={(value) => updateField("travelType", value)}
              options={TRAVEL_TYPES}
            />
            {form.travelType === "other" ? (
              <OtherTextField
                label="Write Other Travel Type"
                value={form.travelTypeOther}
                onChange={(value) => updateField("travelTypeOther", value)}
                placeholder="Write the travel type"
              />
            ) : null}

            <label className="grid gap-2">
              <span className={labelClass()}>From</span>
              <input
                value={form.travelFrom}
                onChange={(event) => updateField("travelFrom", event.target.value)}
                className={inputClass()}
                placeholder="Start location"
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>To</span>
              <input
                value={form.travelTo}
                onChange={(event) => updateField("travelTo", event.target.value)}
                className={inputClass()}
                placeholder="Destination"
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Travel Date</span>
              <input
                type="date"
                value={form.travelDate}
                onChange={(event) => updateField("travelDate", event.target.value)}
                className={inputClass()}
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Related Project / Client</span>
              <input
                value={form.travelRelatedProject}
                onChange={(event) => updateField("travelRelatedProject", event.target.value)}
                className={inputClass()}
                placeholder="Optional project or client"
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className={labelClass()}>Business Reason</span>
              <textarea
                value={form.travelReason}
                onChange={(event) => updateField("travelReason", event.target.value)}
                className={textareaClass()}
                placeholder="Explain why this travel was needed"
              />
            </label>
          </div>
        </SectionCard>
      );
    }

    if (form.expenseType === "meals") {
      return (
        <SectionCard
          title="Meal Details"
          description="Capture restaurant/vendor, attendees, and business purpose."
          icon={Receipt}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className={labelClass()}>Restaurant / Vendor</span>
              <input
                value={form.mealVendorName}
                onChange={(event) => updateField("mealVendorName", event.target.value)}
                className={inputClass()}
                placeholder="Restaurant or vendor name"
              />
            </label>

            <SelectField
              label="Meal Type"
              value={form.mealType}
              onChange={(value) => updateField("mealType", value)}
              options={MEAL_TYPES}
            />
            {form.mealType === "other" ? (
              <OtherTextField
                label="Write Other Meal Type"
                value={form.mealTypeOther}
                onChange={(value) => updateField("mealTypeOther", value)}
                placeholder="Write the meal type"
              />
            ) : null}

            <label className="grid gap-2">
              <span className={labelClass()}>Meal Date</span>
              <input
                type="date"
                value={form.mealDate}
                onChange={(event) => updateField("mealDate", event.target.value)}
                className={inputClass()}
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Attendees</span>
              <input
                value={form.mealAttendees}
                onChange={(event) => updateField("mealAttendees", event.target.value)}
                className={inputClass()}
                placeholder="Names or team/group"
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className={labelClass()}>Business Purpose</span>
              <textarea
                value={form.mealBusinessPurpose}
                onChange={(event) => updateField("mealBusinessPurpose", event.target.value)}
                className={textareaClass()}
                placeholder="Explain the business purpose"
              />
            </label>
          </div>
        </SectionCard>
      );
    }

    if (form.expenseType === "bank_charges") {
      return (
        <SectionCard
          title="Bank Charge Details"
          description="Capture bank fee type, reference, period, and bank context."
          icon={Landmark}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className={labelClass()}>Bank Name</span>
              <input
                value={form.bankName}
                onChange={(event) => updateField("bankName", event.target.value)}
                className={inputClass()}
                placeholder="Bank name"
              />
            </label>

            <SelectField
              label="Fee Type"
              value={form.bankFeeType}
              onChange={(value) => updateField("bankFeeType", value)}
              options={BANK_FEE_TYPES}
            />
            {form.bankFeeType === "other" ? (
              <OtherTextField
                label="Write Other Bank Charge Type"
                value={form.bankFeeTypeOther}
                onChange={(value) => updateField("bankFeeTypeOther", value)}
                placeholder="Write the bank charge type"
              />
            ) : null}

            <label className="grid gap-2">
              <span className={labelClass()}>Account Reference</span>
              <input
                value={form.bankAccountReference}
                onChange={(event) => updateField("bankAccountReference", event.target.value)}
                className={inputClass()}
                placeholder="Account or bank reference"
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Transaction Reference</span>
              <input
                value={form.bankTransactionReference}
                onChange={(event) =>
                  updateField("bankTransactionReference", event.target.value)
                }
                className={inputClass()}
                placeholder="Transaction reference"
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Fee Period From</span>
              <input
                type="date"
                value={form.bankFeePeriodFrom}
                onChange={(event) => updateField("bankFeePeriodFrom", event.target.value)}
                className={inputClass()}
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Fee Period To</span>
              <input
                type="date"
                value={form.bankFeePeriodTo}
                onChange={(event) => updateField("bankFeePeriodTo", event.target.value)}
                className={inputClass()}
              />
            </label>
          </div>
        </SectionCard>
      );
    }

    if (form.expenseType === "legal_accounting") {
      return (
        <SectionCard
          title="Legal / Accounting Details"
          description="Capture service provider, service period, and matter reference."
          icon={Receipt}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className={labelClass()}>Service Provider</span>
              <input
                value={form.legalProviderName}
                onChange={(event) => updateField("legalProviderName", event.target.value)}
                className={inputClass()}
                placeholder="Lawyer, accountant, auditor, consultant"
              />
            </label>

            <SelectField
              label="Service Type"
              value={form.legalServiceType}
              onChange={(value) => updateField("legalServiceType", value)}
              options={LEGAL_SERVICE_TYPES}
            />
            {form.legalServiceType === "other" ? (
              <OtherTextField
                label="Write Other Service Type"
                value={form.legalServiceTypeOther}
                onChange={(value) => updateField("legalServiceTypeOther", value)}
                placeholder="Write the service type"
              />
            ) : null}

            <label className="grid gap-2">
              <span className={labelClass()}>Service Period From</span>
              <input
                type="date"
                value={form.legalPeriodFrom}
                onChange={(event) => updateField("legalPeriodFrom", event.target.value)}
                className={inputClass()}
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Service Period To</span>
              <input
                type="date"
                value={form.legalPeriodTo}
                onChange={(event) => updateField("legalPeriodTo", event.target.value)}
                className={inputClass()}
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className={labelClass()}>Matter / Case / Project Reference</span>
              <input
                value={form.legalMatterReference}
                onChange={(event) => updateField("legalMatterReference", event.target.value)}
                className={inputClass()}
                placeholder="Case, matter, audit, tax, or project reference"
              />
            </label>
          </div>
        </SectionCard>
      );
    }

    if (form.expenseType === "government_fee") {
      return (
        <SectionCard
          title="Government Fee Details"
          description="Capture authority, official fee type, reference number, and due date."
          icon={Landmark}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className={labelClass()}>Government Authority</span>
              <input
                value={form.governmentAuthorityName}
                onChange={(event) =>
                  updateField("governmentAuthorityName", event.target.value)
                }
                className={inputClass()}
                placeholder="Authority or office name"
              />
            </label>

            <SelectField
              label="Fee Type"
              value={form.governmentFeeType}
              onChange={(value) => updateField("governmentFeeType", value)}
              options={GOVERNMENT_FEE_TYPES}
            />
            {form.governmentFeeType === "other" ? (
              <OtherTextField
                label="Write Other Government Fee Type"
                value={form.governmentFeeTypeOther}
                onChange={(value) => updateField("governmentFeeTypeOther", value)}
                placeholder="Write the fee type"
              />
            ) : null}

            <label className="grid gap-2">
              <span className={labelClass()}>Reference Number</span>
              <input
                value={form.governmentReferenceNumber}
                onChange={(event) =>
                  updateField("governmentReferenceNumber", event.target.value)
                }
                className={inputClass()}
                placeholder="Official reference number"
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Due Date</span>
              <input
                type="date"
                value={form.governmentDueDate}
                onChange={(event) => updateField("governmentDueDate", event.target.value)}
                className={inputClass()}
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className={labelClass()}>Payment Link</span>
              <input
                value={form.governmentPaymentLink}
                onChange={(event) => updateField("governmentPaymentLink", event.target.value)}
                className={inputClass()}
                placeholder="Optional official payment link"
              />
            </label>
          </div>
        </SectionCard>
      );
    }

    if (form.expenseType === "repair_service") {
      return (
        <SectionCard
          title="Repair / Service Details"
          description="Capture provider, asset, service date, issue, and service result."
          icon={Wrench}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className={labelClass()}>Service Provider</span>
              <input
                value={form.repairProviderName}
                onChange={(event) => updateField("repairProviderName", event.target.value)}
                className={inputClass()}
                placeholder="Service provider name"
              />
            </label>

            <SelectField
              label="Service Type"
              value={form.repairServiceType}
              onChange={(value) => updateField("repairServiceType", value)}
              options={REPAIR_SERVICE_TYPES}
            />
            {form.repairServiceType === "other" ? (
              <OtherTextField
                label="Write Other Service Type"
                value={form.repairServiceTypeOther}
                onChange={(value) => updateField("repairServiceTypeOther", value)}
                placeholder="Write the service type"
              />
            ) : null}

            <label className="grid gap-2">
              <span className={labelClass()}>Asset / Equipment</span>
              <input
                value={form.repairAssetName}
                onChange={(event) => updateField("repairAssetName", event.target.value)}
                className={inputClass()}
                placeholder="Machine, computer, vehicle, facility"
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Service Date</span>
              <input
                type="date"
                value={form.repairServiceDate}
                onChange={(event) => updateField("repairServiceDate", event.target.value)}
                className={inputClass()}
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className={labelClass()}>Issue Description</span>
              <textarea
                value={form.repairIssueDescription}
                onChange={(event) =>
                  updateField("repairIssueDescription", event.target.value)
                }
                className={textareaClass()}
                placeholder="Explain the issue"
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className={labelClass()}>Service Result</span>
              <textarea
                value={form.repairServiceResult}
                onChange={(event) => updateField("repairServiceResult", event.target.value)}
                className={textareaClass()}
                placeholder="Optional service result or report summary"
              />
            </label>
          </div>
        </SectionCard>
      );
    }

    if (form.expenseType === "company_support") {
      return (
        <SectionCard
          title="Company Support Details"
          description="Capture support type, recipient, reason, and optional support period."
          icon={Building2}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Support Type"
              value={form.companySupportType}
              onChange={(value) => updateField("companySupportType", value)}
              options={COMPANY_SUPPORT_TYPES}
            />
            {form.companySupportType === "other" ? (
              <OtherTextField
                label="Write Other Support Type"
                value={form.companySupportTypeOther}
                onChange={(value) => updateField("companySupportTypeOther", value)}
                placeholder="Write the support type"
              />
            ) : null}

            <label className="grid gap-2">
              <span className={labelClass()}>Receiving Person / Company</span>
              <input
                value={form.companySupportRecipient}
                onChange={(event) =>
                  updateField("companySupportRecipient", event.target.value)
                }
                className={inputClass()}
                placeholder="Recipient name or company"
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Support Period From</span>
              <input
                type="date"
                value={form.companySupportPeriodFrom}
                onChange={(event) =>
                  updateField("companySupportPeriodFrom", event.target.value)
                }
                className={inputClass()}
              />
            </label>

            <label className="grid gap-2">
              <span className={labelClass()}>Support Period To</span>
              <input
                type="date"
                value={form.companySupportPeriodTo}
                onChange={(event) =>
                  updateField("companySupportPeriodTo", event.target.value)
                }
                className={inputClass()}
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className={labelClass()}>Support Reason</span>
              <textarea
                value={form.companySupportReason}
                onChange={(event) => updateField("companySupportReason", event.target.value)}
                className={textareaClass()}
                placeholder="Explain why this support is needed"
              />
            </label>
          </div>
        </SectionCard>
      );
    }

    return (
      <SectionCard
        title="Other Expense Details"
        description="Use this only when the expense does not fit the standard categories."
        icon={Receipt}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Other Category"
            value={form.otherExpenseCategory}
            onChange={(value) => updateField("otherExpenseCategory", value)}
            options={OTHER_EXPENSE_CATEGORIES}
          />
          {form.otherExpenseCategory === "other" ? (
            <OtherTextField
              label="Write Other Category"
              value={form.otherExpenseCategoryOther}
              onChange={(value) => updateField("otherExpenseCategoryOther", value)}
              placeholder="Write the other category"
            />
          ) : null}

          <label className="grid gap-2 md:col-span-2">
            <span className={labelClass()}>Why It Does Not Fit Existing Types</span>
            <textarea
              value={form.otherExpenseExplanation}
              onChange={(event) => updateField("otherExpenseExplanation", event.target.value)}
              className={textareaClass()}
              placeholder="Explain why this expense does not fit any existing type"
            />
          </label>
        </div>
      </SectionCard>
    );
  };

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_30%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/expenses")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Expenses
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  New Expense Request
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Request, Subscription, or Recurring Expense
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Create one-time operating expenses or admin-prepared subscription expenses.
                  Each expense type opens the exact fields needed for that category, with
                  required “Other” explanations when Other is selected.
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <SmallInfoPill
                    title="Page Mode"
                    value={isSubscriptionExpense ? "Subscription Ready" : "One-Time Request"}
                  />
                  <SmallInfoPill
                    title="Options"
                    value={
                      isRefreshingOptions
                        ? "Silent Refresh"
                        : isLoadingOptions
                          ? "Loading"
                          : "Ready"
                    }
                  />
                  <SmallInfoPill title="Permissions" value="Admin Gate Later" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SummaryBlock
                  title="Requested Amount"
                  value={formatMoney(form.currencyCode, amountValue)}
                  subtitle="This is the estimated, actual, or recurring subscription amount."
                />
                <SummaryBlock
                  title="Schedule"
                  value={subscriptionSummary}
                  subtitle="Automatic generation is metadata-ready and needs backend scheduler later."
                />
              </div>
            </div>
          </div>
        </header>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-6">
            <SectionCard
              title="Expense Made By"
              description="Record who requested or made this expense. Do not use vendor/payee wording."
              icon={UserRound}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className={labelClass()}>Expense Made By Type</span>
                  <select
                    value={form.expenseMadeByType}
                    onChange={(event) =>
                      updateField(
                        "expenseMadeByType",
                        event.target.value as ExpenseMadeByType
                      )
                    }
                    className={inputClass()}
                  >
                    <option value="employee">Employee</option>
                    <option value="owner_management">Owner / Management</option>
                    <option value="company_direct">Company Direct</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                {form.expenseMadeByType === "employee" ? (
                  <label className="grid gap-2">
                    <span className={labelClass()}>Employee</span>
                    <select
                      value={form.employeeRefId}
                      onChange={(event) => updateField("employeeRefId", event.target.value)}
                      className={inputClass()}
                      disabled={isLoadingOptions && !hasUsableOptions}
                    >
                      <option value="">Select employee</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {formatEmployeeLabel(employee, profileMap)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {form.expenseMadeByType === "owner_management" ? (
                  <label className="grid gap-2">
                    <span className={labelClass()}>Responsible Person</span>
                    <input
                      value={form.responsiblePersonName}
                      onChange={(event) =>
                        updateField("responsiblePersonName", event.target.value)
                      }
                      className={inputClass()}
                      placeholder="Owner / manager name"
                    />
                  </label>
                ) : null}

                {form.expenseMadeByType === "other" ? (
                  <label className="grid gap-2 md:col-span-2">
                    <span className={labelClass()}>Other Explanation</span>
                    <input
                      value={form.otherMadeByExplanation}
                      onChange={(event) =>
                        updateField("otherMadeByExplanation", event.target.value)
                      }
                      className={inputClass()}
                      placeholder="Explain who made this expense"
                    />
                  </label>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title="Expense Request"
              description="Describe the expense and the company it belongs to."
              icon={Receipt}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className={labelClass()}>Expense Company</span>
                  <select
                    value={form.companyId}
                    onChange={(event) => updateField("companyId", event.target.value)}
                    className={inputClass()}
                    disabled={isLoadingOptions && !hasUsableOptions}
                  >
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name || "Unnamed company"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Expense Type</span>
                  <select
                    value={form.expenseType}
                    onChange={(event) => updateField("expenseType", event.target.value)}
                    className={inputClass()}
                  >
                    {EXPENSE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Expense Title</span>
                  <input
                    value={form.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    className={inputClass()}
                    placeholder="Short title for this expense request"
                  />
                </label>

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Expense Source</span>
                  <input
                    value={form.expenseSourceName}
                    onChange={(event) =>
                      updateField("expenseSourceName", event.target.value)
                    }
                    className={inputClass()}
                    placeholder="Where this expense comes from, for example ChatGPT, Amazon order, legal service, office support"
                  />
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Requested Amount</span>
                  <input
                    value={form.requestedAmount}
                    onChange={(event) => updateField("requestedAmount", event.target.value)}
                    className={inputClass()}
                    inputMode="decimal"
                    placeholder="20.00"
                  />
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Currency</span>
                  <select
                    value={form.currencyCode}
                    onChange={(event) =>
                      updateField("currencyCode", event.target.value.toUpperCase())
                    }
                    className={inputClass()}
                  >
                    {CURRENCY_CODES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Expected Expense Date</span>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={(event) => updateField("expenseDate", event.target.value)}
                    className={inputClass()}
                  />
                </label>

                <label className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.isRetroactive}
                    onChange={(event) =>
                      updateField("isRetroactive", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-white/20 bg-black/20"
                  />
                  <span className="text-sm text-slate-300">
                    Retroactive expense already happened
                  </span>
                </label>

                {form.isRetroactive ? (
                  <label className="grid gap-2 md:col-span-2">
                    <span className={labelClass()}>Retroactive Reason</span>
                    <input
                      value={form.retroactiveReason}
                      onChange={(event) =>
                        updateField("retroactiveReason", event.target.value)
                      }
                      className={inputClass()}
                      placeholder="Explain why this was not requested before spending"
                    />
                  </label>
                ) : null}

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Description / Reason</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    className={textareaClass()}
                    placeholder="Explain why this expense is needed"
                  />
                </label>
              </div>
            </SectionCard>

            {renderDynamicExpenseSection()}

            <SectionCard
              title="Admin Subscription Option"
              description="Prepare monthly, yearly, or one-year upfront recurring expenses. Permissions will be enforced later."
              icon={CalendarClock}
            >
              <div className="grid gap-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <label className="flex min-h-[72px] items-center gap-3 rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSubscriptionExpense}
                      onChange={(event) =>
                        updateField("isSubscriptionExpense", event.target.checked)
                      }
                      disabled={isSubscriptionType}
                      className="h-4 w-4 rounded border-white/20 bg-black/20"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-cyan-100">
                        This is a subscription / recurring expense
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-cyan-100/70">
                        Admin-only option now. Permission gate will be added later.
                      </span>
                    </span>
                  </label>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Auto Future Expenses
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">
                      This page stores the schedule. Backend scheduler/RPC can generate future
                      expenses later without redesigning this page.
                    </div>
                  </div>
                </div>

                {isSubscriptionExpense ? (
                  <div className="grid gap-4 rounded-[28px] border border-white/10 bg-black/20 p-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className={labelClass()}>Provider / Service Name</span>
                      <input
                        value={form.subscriptionProviderName}
                        onChange={(event) =>
                          updateField("subscriptionProviderName", event.target.value)
                        }
                        className={inputClass()}
                        placeholder="ChatGPT, Google Workspace, Adobe..."
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Account / Contract Reference</span>
                      <input
                        value={form.subscriptionAccountReference}
                        onChange={(event) =>
                          updateField("subscriptionAccountReference", event.target.value)
                        }
                        className={inputClass()}
                        placeholder="Account email, contract ID, workspace name"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Billing Frequency</span>
                      <select
                        value={form.subscriptionBillingFrequency}
                        onChange={(event) =>
                          updateField(
                            "subscriptionBillingFrequency",
                            event.target.value as BillingFrequency
                          )
                        }
                        className={inputClass()}
                      >
                        {BILLING_FREQUENCIES.map((frequency) => (
                          <option key={frequency.value} value={frequency.value}>
                            {frequency.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs leading-5 text-slate-500">
                        {
                          BILLING_FREQUENCIES.find(
                            (frequency) =>
                              frequency.value === form.subscriptionBillingFrequency
                          )?.helper
                        }
                      </span>
                    </label>

                    {form.subscriptionBillingFrequency === "other" ? (
                      <OtherTextField
                        label="Write Other Billing Frequency"
                        value={form.subscriptionBillingFrequencyOther}
                        onChange={(value) =>
                          updateField("subscriptionBillingFrequencyOther", value)
                        }
                        placeholder="Write the billing frequency"
                      />
                    ) : null}

                    <label className="grid gap-2">
                      <span className={labelClass()}>Amount Basis</span>
                      <select
                        value={form.subscriptionAmountBasis}
                        onChange={(event) =>
                          updateField(
                            "subscriptionAmountBasis",
                            event.target.value as SubscriptionAmountBasis
                          )
                        }
                        className={inputClass()}
                      >
                        {SUBSCRIPTION_AMOUNT_BASIS_OPTIONS.map((basis) => (
                          <option key={basis.value} value={basis.value}>
                            {basis.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {form.subscriptionAmountBasis === "other_subscription_payment" ? (
                      <OtherTextField
                        label="Write Other Amount Basis"
                        value={form.subscriptionAmountBasisOther}
                        onChange={(value) => updateField("subscriptionAmountBasisOther", value)}
                        placeholder="Write the amount basis"
                      />
                    ) : null}

                    <label className="grid gap-2">
                      <span className={labelClass()}>Subscription Start Date</span>
                      <input
                        type="date"
                        value={form.subscriptionStartDate}
                        onChange={(event) =>
                          updateField("subscriptionStartDate", event.target.value)
                        }
                        className={inputClass()}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>End / Renewal Date</span>
                      <input
                        type="date"
                        value={form.subscriptionRenewalDate}
                        onChange={(event) =>
                          updateField("subscriptionRenewalDate", event.target.value)
                        }
                        className={inputClass()}
                      />
                    </label>

                    <label className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
                      <input
                        type="checkbox"
                        checked={form.subscriptionAutoCreateFutureExpenses}
                        onChange={(event) =>
                          updateField(
                            "subscriptionAutoCreateFutureExpenses",
                            event.target.checked
                          )
                        }
                        className="h-4 w-4 rounded border-white/20 bg-black/20"
                      />
                      <span className="text-sm leading-6 text-slate-300">
                        Mark this subscription as ready for automatic future expense creation.
                      </span>
                    </label>

                    <label className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
                      <input
                        type="checkbox"
                        checked={form.subscriptionRenewalReminder}
                        onChange={(event) =>
                          updateField("subscriptionRenewalReminder", event.target.checked)
                        }
                        className="h-4 w-4 rounded border-white/20 bg-black/20"
                      />
                      <span className="text-sm leading-6 text-slate-300">
                        Keep renewal reminder enabled for Finance/Admin.
                      </span>
                    </label>

                    <label className="grid gap-2 md:col-span-2">
                      <span className={labelClass()}>Admin Subscription Notes</span>
                      <textarea
                        value={form.subscriptionAdminNotes}
                        onChange={(event) =>
                          updateField("subscriptionAdminNotes", event.target.value)
                        }
                        className={textareaClass()}
                        placeholder="Internal notes for admin subscription control"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            </SectionCard>

            {isSubscriptionExpense ? (
              <SectionCard
                title="Subscription Credit Card"
                description="Store masked card references only. Full card numbers are not stored here."
                icon={CreditCard}
              >
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className={labelClass()}>Subscription Payment Method</span>
                      <select
                        value={form.subscriptionPaymentMethod}
                        onChange={(event) =>
                          updateField(
                            "subscriptionPaymentMethod",
                            event.target.value as SubscriptionPaymentMethod
                          )
                        }
                        className={inputClass()}
                      >
                        {SUBSCRIPTION_PAYMENT_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {form.subscriptionPaymentMethod === "other" ? (
                      <OtherTextField
                        label="Write Other Payment Method"
                        value={form.subscriptionPaymentMethodOther}
                        onChange={(value) =>
                          updateField("subscriptionPaymentMethodOther", value)
                        }
                        placeholder="Write the payment method"
                      />
                    ) : null}

                    <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4 md:col-span-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                        <ShieldCheck className="h-4 w-4" />
                        Hidden After Save
                      </div>
                      <p className="mt-2 text-xs leading-5 text-amber-100/70">
                        Save nickname, brand, holder, expiry, and last 4 only. Do not enter or
                        store the full card number in this page.
                      </p>
                    </div>
                  </div>

                  {form.subscriptionPaymentMethod === "credit_card" ? (
                    <div className="grid gap-3">
                      {form.subscriptionCards.map((card, cardIndex) => (
                        <div
                          key={card.id}
                          className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                        >
                          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-white">
                                Card {cardIndex + 1}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {maskCard(card.last4)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeSubscriptionCard(card.id)}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15"
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </button>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="grid gap-2">
                              <span className={labelClass()}>Card Nickname</span>
                              <input
                                value={card.nickname}
                                onChange={(event) =>
                                  updateSubscriptionCard(
                                    card.id,
                                    "nickname",
                                    event.target.value
                                  )
                                }
                                className={inputClass()}
                                placeholder="Admin Visa, ChatGPT Card..."
                              />
                            </label>

                            <label className="grid gap-2">
                              <span className={labelClass()}>Cardholder Name</span>
                              <input
                                value={card.cardholderName}
                                onChange={(event) =>
                                  updateSubscriptionCard(
                                    card.id,
                                    "cardholderName",
                                    event.target.value
                                  )
                                }
                                className={inputClass()}
                                placeholder="Name on card"
                              />
                            </label>

                            <SelectField
                              label="Card Brand"
                              value={card.brand}
                              onChange={(value) =>
                                updateSubscriptionCard(card.id, "brand", value)
                              }
                              options={CARD_BRANDS}
                            />
                            {card.brand === "other" ? (
                              <OtherTextField
                                label="Write Other Card Brand"
                                value={card.brandOther}
                                onChange={(value) =>
                                  updateSubscriptionCard(card.id, "brandOther", value)
                                }
                                placeholder="Write the card brand"
                              />
                            ) : null}

                            <label className="grid gap-2">
                              <span className={labelClass()}>Last 4 Digits Only</span>
                              <input
                                value={card.last4}
                                onChange={(event) =>
                                  updateSubscriptionCard(card.id, "last4", event.target.value)
                                }
                                className={inputClass()}
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="1234"
                              />
                            </label>

                            <label className="grid gap-2">
                              <span className={labelClass()}>Expiry Month</span>
                              <input
                                value={card.expiryMonth}
                                onChange={(event) =>
                                  updateSubscriptionCard(
                                    card.id,
                                    "expiryMonth",
                                    event.target.value
                                  )
                                }
                                className={inputClass()}
                                inputMode="numeric"
                                maxLength={2}
                                placeholder="MM"
                              />
                            </label>

                            <label className="grid gap-2">
                              <span className={labelClass()}>Expiry Year</span>
                              <input
                                value={card.expiryYear}
                                onChange={(event) =>
                                  updateSubscriptionCard(
                                    card.id,
                                    "expiryYear",
                                    event.target.value
                                  )
                                }
                                className={inputClass()}
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="YYYY"
                              />
                            </label>

                            <label className="grid gap-2 md:col-span-2">
                              <span className={labelClass()}>Billing Company / Context</span>
                              <input
                                value={card.billingCompany}
                                onChange={(event) =>
                                  updateSubscriptionCard(
                                    card.id,
                                    "billingCompany",
                                    event.target.value
                                  )
                                }
                                className={inputClass()}
                                placeholder="Company, department, or use context"
                              />
                            </label>

                            <label className="grid gap-2 md:col-span-2">
                              <span className={labelClass()}>Card Notes</span>
                              <textarea
                                value={card.notes}
                                onChange={(event) =>
                                  updateSubscriptionCard(card.id, "notes", event.target.value)
                                }
                                className={textareaClass()}
                                placeholder="Internal admin notes. Do not write full card number here."
                              />
                            </label>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addSubscriptionCard}
                        className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                      >
                        <Plus className="h-4 w-4" />
                        Add Another Card
                      </button>
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            ) : null}

            <SectionCard
              title="Supporting Documentation"
              description="Upload a file, screenshot, receipt, invoice, official document, or add a documentation link."
              icon={UploadCloud}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className={labelClass()}>Upload File / Screenshot / Document</span>
                  <div className="rounded-[24px] border border-dashed border-white/15 bg-black/20 p-4">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                      onChange={(event) =>
                        setDocumentationFile(event.target.files?.[0] ?? null)
                      }
                      className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-100"
                    />
                    <div className="mt-3 text-xs leading-5 text-slate-500">
                      PDF, image/screenshot, Word, or Excel. MIME type is resolved before upload.
                    </div>
                    {documentationFile ? (
                      <div className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                        {documentationFile.name}
                      </div>
                    ) : null}
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Documentation Link</span>
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={form.externalDocumentationLink}
                      onChange={(event) =>
                        updateField("externalDocumentationLink", event.target.value)
                      }
                      className={`${inputClass()} pl-11`}
                      placeholder="Receipt, order, Drive, portal, or official link"
                    />
                  </div>
                </label>

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Internal Notes</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    className={textareaClass()}
                    placeholder="Optional notes for Finance"
                  />
                </label>
              </div>
            </SectionCard>
          </div>

          <aside className="sticky top-6 grid gap-6 self-start">
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Request Summary
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Review before saving or submitting.
                </p>
              </div>

              <div className="grid gap-3 p-5">
                <SummaryBlock
                  title="Company"
                  value={selectedCompany?.name || "Not selected"}
                  subtitle="The company this expense belongs to."
                />
                <SummaryBlock
                  title="Made By"
                  value={
                    form.expenseMadeByType === "employee"
                      ? selectedEmployeeLabel || "Employee not selected"
                      : form.expenseMadeByType === "owner_management"
                        ? form.responsiblePersonName || "Owner / Management"
                        : form.expenseMadeByType === "company_direct"
                          ? "Company Direct"
                          : form.otherMadeByExplanation || "Other"
                  }
                  subtitle="The person or context that made the expense."
                />
                <SummaryBlock
                  title="Expense Source"
                  value={form.expenseSourceName || "Not entered"}
                  subtitle="The source that generated the expense."
                />
                <SummaryBlock
                  title="Expense Type"
                  value={getOptionLabel(
                    EXPENSE_TYPES,
                    form.expenseType,
                    form.otherExpenseExplanation
                  )}
                  subtitle="The dynamic section changes by expense type."
                />
                <SummaryBlock
                  title="Subscription"
                  value={isSubscriptionExpense ? "Enabled" : "Disabled"}
                  subtitle={
                    isSubscriptionExpense
                      ? `${form.subscriptionProviderName || "Provider not entered"} • ${subscriptionSummary}`
                      : "This request is currently a one-time expense."
                  }
                />
                <SummaryBlock
                  title="Card"
                  value={
                    isSubscriptionExpense &&
                    form.subscriptionPaymentMethod === "credit_card"
                      ? `${sanitizedSubscriptionCards.length} masked card${
                          sanitizedSubscriptionCards.length === 1 ? "" : "s"
                        }`
                      : isSubscriptionExpense &&
                          form.subscriptionPaymentMethod === "no_card"
                        ? "No Card"
                        : isSubscriptionExpense &&
                            form.subscriptionPaymentMethod === "other"
                          ? form.subscriptionPaymentMethodOther || "Other"
                          : "Not selected"
                  }
                  subtitle="Only masked card references are saved in metadata."
                />
              </div>
            </section>

            {formError ? (
              <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
                {formError}
              </div>
            ) : null}

            {formSuccess ? (
              <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
                {formSuccess}
              </div>
            ) : null}

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="grid gap-3">
                <button
                  type="button"
                  disabled={isSaving || (isLoadingOptions && !hasUsableOptions)}
                  onClick={() => void saveExpense("request")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Submit Request
                </button>

                <button
                  type="button"
                  disabled={isSaving || (isLoadingOptions && !hasUsableOptions)}
                  onClick={() => void saveExpense("draft")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Draft
                </button>
              </div>

              <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4 text-xs leading-5 text-slate-500">
                Funding company, bank account, Payment Made creation, and allocation are handled
                later by Finance/Admin in Operating Expense Payments. This page keeps existing
                options visible during silent refresh to avoid reload flicker.
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
