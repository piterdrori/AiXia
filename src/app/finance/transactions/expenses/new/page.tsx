import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
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
type SubscriptionPaymentMethod = "not_selected" | "no_card" | "credit_card";

type CreditCardDraft = {
  id: string;
  nickname: string;
  cardholderName: string;
  brand: string;
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
  onlinePlatform: string;
  onlineOrderNumber: string;
  onlineOrderDate: string;
  onlineOrderUrl: string;
  onlineTrackingNumber: string;
  externalDocumentationLink: string;
  notes: string;
  isSubscriptionExpense: boolean;
  subscriptionProviderName: string;
  subscriptionBillingFrequency: BillingFrequency;
  subscriptionAmountBasis: SubscriptionAmountBasis;
  subscriptionStartDate: string;
  subscriptionRenewalDate: string;
  subscriptionAccountReference: string;
  subscriptionAutoCreateFutureExpenses: boolean;
  subscriptionRenewalReminder: boolean;
  subscriptionPaymentMethod: SubscriptionPaymentMethod;
  subscriptionAdminNotes: string;
  subscriptionCards: CreditCardDraft[];
};

type CachedOptionsPayload = {
  companies: CompanyRow[];
  employees: EmployeeRefRow[];
  profiles: ProfileRow[];
  cachedAt: number;
};

const EXPENSE_TYPES = [
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
  { value: "monthly_payment", label: "Monthly payment" },
  { value: "yearly_payment", label: "Yearly payment" },
  { value: "one_year_upfront_payment", label: "One-year upfront payment" },
  { value: "other_subscription_payment", label: "Other subscription payment" },
];

const CARD_BRANDS = ["Visa", "Mastercard", "American Express", "Discover", "UnionPay", "Other"];
const CURRENCY_CODES = ["USD", "EUR", "ILS", "CNY", "HKD", "GBP"];
const OPTIONS_CACHE_KEY = "aixia.finance.expenses.new.options.v1";
const OPTIONS_CACHE_TTL_MS = 1000 * 60 * 5;

const initialSubscriptionCard = (): CreditCardDraft => ({
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `card-${Math.random().toString(36).slice(2)}`,
  nickname: "",
  cardholderName: "",
  brand: "Visa",
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
  onlinePlatform: "",
  onlineOrderNumber: "",
  onlineOrderDate: "",
  onlineOrderUrl: "",
  onlineTrackingNumber: "",
  externalDocumentationLink: "",
  notes: "",
  isSubscriptionExpense: false,
  subscriptionProviderName: "",
  subscriptionBillingFrequency: "monthly",
  subscriptionAmountBasis: "monthly_payment",
  subscriptionStartDate: new Date().toISOString().slice(0, 10),
  subscriptionRenewalDate: "",
  subscriptionAccountReference: "",
  subscriptionAutoCreateFutureExpenses: true,
  subscriptionRenewalReminder: true,
  subscriptionPaymentMethod: "not_selected",
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
  return `${currencyCode} ${amount > 0 ? amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) : "0.00"}`;
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

export default function FinanceNewExpensePage() {
  const navigate = useNavigate();

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

    const frequencyLabel =
      BILLING_FREQUENCIES.find(
        (frequency) => frequency.value === form.subscriptionBillingFrequency
      )?.label ?? "Subscription";

    return `${frequencyLabel} • ${formatMoney(form.currencyCode, amountValue)}`;
  }, [
    amountValue,
    form.currencyCode,
    form.subscriptionBillingFrequency,
    isSubscriptionExpense,
  ]);

  const sanitizedSubscriptionCards = useMemo(() => {
    return form.subscriptionCards
      .map((card) => ({
        id: card.id,
        nickname: card.nickname.trim(),
        cardholder_name: card.cardholderName.trim(),
        brand: card.brand.trim(),
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

  const hasUsableOptions = companies.length > 0 || employees.length > 0;

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

      if (form.expenseMadeByType === "other" && !form.otherMadeByExplanation.trim()) {
        return "Other explanation is required when Expense Made By is Other.";
      }

      if (isOtherExpenseType && !form.otherExpenseExplanation.trim()) {
        return "Other Expense Explanation is required when Expense Type is Other.";
      }

      if (form.isRetroactive && !form.retroactiveReason.trim()) {
        return "Retroactive reason is required.";
      }

      if (isOnlineShopping && !form.onlinePlatform.trim()) {
        return "Online platform is required for online shopping expenses.";
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
      isOnlineShopping,
      isOtherExpenseType,
      isSubscriptionExpense,
      sanitizedSubscriptionCards,
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

        const subscriptionMetadata = isSubscriptionExpense
          ? {
              is_subscription: true,
              admin_only_option: true,
              permission_enforcement_pending: true,
              provider_name: form.subscriptionProviderName.trim(),
              billing_frequency: form.subscriptionBillingFrequency,
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
              amount: amountValue,
              currency_code: form.currencyCode.trim().toUpperCase(),
              next_expected_expense_date: form.subscriptionRenewalDate || null,
              payment_method: form.subscriptionPaymentMethod,
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
          online_shopping: isOnlineShopping
            ? {
                platform: form.onlinePlatform.trim(),
                order_number: form.onlineOrderNumber.trim(),
                order_date: form.onlineOrderDate || null,
                order_url: form.onlineOrderUrl.trim(),
                tracking_number: form.onlineTrackingNumber.trim(),
              }
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
            online_platform: isOnlineShopping ? form.onlinePlatform.trim() : null,
            online_order_number: isOnlineShopping
              ? form.onlineOrderNumber.trim() || null
              : null,
            online_order_date:
              isOnlineShopping && form.onlineOrderDate ? form.onlineOrderDate : null,
            online_order_url: isOnlineShopping ? form.onlineOrderUrl.trim() || null : null,
            online_tracking_number: isOnlineShopping
              ? form.onlineTrackingNumber.trim() || null
              : null,
            online_confirmation_status: isOnlineShopping
              ? "not_confirmed"
              : "not_applicable",
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
      documentationStatus,
      form,
      isOnlineShopping,
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
                  Funding, bank allocation, payment execution, and coverage are still handled
                  later by Finance/Admin in the Operating Expense Payments flow.
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
                  <SmallInfoPill
                    title="Permissions"
                    value="Admin Gate Later"
                  />
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

                {isOtherExpenseType ? (
                  <label className="grid gap-2 md:col-span-2">
                    <span className={labelClass()}>Other Expense Explanation</span>
                    <input
                      value={form.otherExpenseExplanation}
                      onChange={(event) =>
                        updateField("otherExpenseExplanation", event.target.value)
                      }
                      className={inputClass()}
                      placeholder="Explain the Other expense type"
                    />
                  </label>
                ) : null}

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
                        <option value="not_selected">Select payment method</option>
                        <option value="no_card">No credit card / manual payment</option>
                        <option value="credit_card">Credit card on file</option>
                      </select>
                    </label>

                    <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4">
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

                            <label className="grid gap-2">
                              <span className={labelClass()}>Card Brand</span>
                              <select
                                value={card.brand}
                                onChange={(event) =>
                                  updateSubscriptionCard(card.id, "brand", event.target.value)
                                }
                                className={inputClass()}
                              >
                                {CARD_BRANDS.map((brand) => (
                                  <option key={brand} value={brand}>
                                    {brand}
                                  </option>
                                ))}
                              </select>
                            </label>

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

            {isOnlineShopping ? (
              <SectionCard
                title="Online Shopping Confirmation"
                description="Capture online order details for later Finance confirmation."
                icon={ShoppingCart}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className={labelClass()}>Online Platform</span>
                    <input
                      value={form.onlinePlatform}
                      onChange={(event) => updateField("onlinePlatform", event.target.value)}
                      className={inputClass()}
                      placeholder="Amazon, Alibaba, Taobao, JD..."
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Order Number</span>
                    <input
                      value={form.onlineOrderNumber}
                      onChange={(event) =>
                        updateField("onlineOrderNumber", event.target.value)
                      }
                      className={inputClass()}
                      placeholder="Order number"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Order Date</span>
                    <input
                      type="date"
                      value={form.onlineOrderDate}
                      onChange={(event) =>
                        updateField("onlineOrderDate", event.target.value)
                      }
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
            ) : null}

            <SectionCard
              title="Supporting Documentation"
              description="Upload a file or add a documentation link. Documentation is required before Finance verification."
              icon={UploadCloud}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className={labelClass()}>Upload File</span>
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
                      PDF, image, Word, or Excel. MIME type is resolved before upload.
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
                      placeholder="Receipt, order, Drive, or portal link"
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
                later by Finance/Admin in Operating Expense Payments. This page never reloads
                visible options during silent refresh if cached data is already available.
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
