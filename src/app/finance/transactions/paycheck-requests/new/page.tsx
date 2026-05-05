import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Download,
  FileSignature,
  LinkIcon,
  Loader2,
  Save,
  Send,
  ShieldCheck,
  UploadCloud,
  UserRound,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import PaycheckRequestPrintDocument from "./PaycheckRequestPrintDocument";

type EmployeeRefRow = {
  id: string;
  user_id: string;
  code: string;
  status: string;
  mark: string | null;
  metadata: Record<string, unknown> | null;
  profile?: {
    user_id: string;
    full_name: string | null;
    display_name: string | null;
    email?: string | null;
  } | null;
};

type PayProfileRow = {
  id: string;
  profile_number: string | null;
  user_id: string;
  pay_type: string;
  payment_frequency: string;
  base_salary: number | string | null;
  hourly_rate: number | string | null;
  default_hours: number | string | null;
  currency_code: string;
  active: boolean;
  status: string;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};

type CurrencyRow = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  status: string;
};

type CompanyRow = {
  id: string;
  name: string | null;
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
  status: string;
};

type BankAccountRow = {
  id: string;
  name: string | null;
  bank_name: string | null;
  institution_name: string | null;
  masked_account_number: string | null;
  currency_code: string | null;
  company_id: string | null;
  beneficiary_name: string | null;
  iban: string | null;
  swift_code: string | null;
  account_identifier_type: string | null;
  account_identifier_value: string | null;
  is_default: boolean | null;
};

type PrintCompanyRow = {
  id: string;
  company_name: string | null;
  legal_name: string | null;
  display_name: string | null;
  registration_number: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_region: string | null;
  postal_code: string | null;
  country: string | null;
  status: string;
};

type SocialInsuranceContributionType = "by_employee" | "by_employer";

type FormState = {
  companyId: string;
  employeeRefId: string;
  payProfileId: string;
  requestedBankAccountId: string;
  joinDate: string;
  periodStart: string;
  periodEnd: string;
  requestedPayDate: string;
  requestedCurrencyCode: string;
  grossAmount: string;
  bonusAmount: string;
  deductionAmount: string;
  reimbursementAmount: string;
  socialInsuranceContributionType: SocialInsuranceContributionType;
  socialInsuranceContributionDetails: string;
  signedFormExternalUrl: string;
  notes: string;
};

type UploadedSignedFormInfo = {
  bucket: string | null;
  path: string | null;
  uploadedAt: string | null;
  fileUploadId: string | null;
};

const BUCKET_NAME = "finance-paycheck-forms";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultPeriodStart() {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function defaultPeriodEnd() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatMoney(value: number | string | null | undefined) {
  return toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getMetadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function buildEmployeeLabel(row: EmployeeRefRow | null | undefined) {
  if (!row) return "Select employee";

  const profileName =
    row.profile?.full_name?.trim() ||
    row.profile?.display_name?.trim() ||
    row.profile?.email?.trim();

  if (profileName) return profileName;

  const metadataName =
    getMetadataString(row.metadata, "full_name") ||
    getMetadataString(row.metadata, "display_name") ||
    getMetadataString(row.metadata, "name");

  if (metadataName) return metadataName;

  return `Employee ${row.code}`;
}

function buildEmployeeSubLabel(row: EmployeeRefRow | null | undefined) {
  if (!row) return "Employee registry required";

  const role =
    getMetadataString(row.metadata, "job_title") ||
    getMetadataString(row.metadata, "source_role") ||
    row.mark;

  const company = getMetadataString(row.metadata, "company");

  return [`Code ${row.code}`, role ? formatLabel(role) : null, company]
    .filter(Boolean)
    .join(" • ");
}

function buildPayProfileLabel(row: PayProfileRow | null | undefined) {
  if (!row) return "Select pay profile";

  return [
    row.profile_number || "Pay Profile",
    formatLabel(row.pay_type),
    formatLabel(row.payment_frequency),
    row.currency_code,
  ]
    .filter(Boolean)
    .join(" • ");
}

function buildCompanyLabel(row: CompanyRow | null | undefined) {
  if (!row) return "Select company";
  return row.legal_name || row.name || "Unnamed company";
}

function buildCompanySubLabel(row: CompanyRow | null | undefined) {
  if (!row) return "Company master data required";

  return [
    row.currency_code ? `Currency ${row.currency_code}` : null,
    [row.city, row.country].filter(Boolean).join(", ") || null,
  ]
    .filter(Boolean)
    .join(" • ");
}

function buildCompanyAddress(row: CompanyRow | null | undefined) {
  if (!row) return "";

  return [
    row.address_line_1,
    row.address_line_2,
    [row.city, row.state_province, row.postal_code].filter(Boolean).join(", "),
    row.country,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildBankLabel(row: BankAccountRow | null | undefined) {
  if (!row) return "Select requested bank account";

  return [
    row.name || row.bank_name || row.institution_name || "Bank account",
    row.currency_code,
    row.masked_account_number,
  ]
    .filter(Boolean)
    .join(" • ");
}

function buildBankIdentifier(row: BankAccountRow | null | undefined) {
  if (!row) return "Employee payment destination";

  if (row.iban) return `IBAN ${row.iban}`;
  if (row.swift_code) return `SWIFT ${row.swift_code}`;

  if (row.account_identifier_type === "swift" && row.account_identifier_value) {
    return `SWIFT ${row.account_identifier_value}`;
  }

  if (row.account_identifier_value) {
    return `Identifier ${row.account_identifier_value}`;
  }

  return row.beneficiary_name || "Bank details available from master data";
}

function sanitizePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80);
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

function inputClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50";
}

function textareaClass() {
  return "min-h-[132px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function SummaryBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{detail}</div>
    </div>
  );
}

function SelectShell({
  label,
  value,
  onChange,
  children,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className={labelClass()}>{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass()}
      >
        {children}
      </select>
    </label>
  );
}

export default function NewPaycheckRequestPage() {
  const navigate = useNavigate();

  const [employeeRefs, setEmployeeRefs] = useState<EmployeeRefRow[]>([]);
  const [payProfiles, setPayProfiles] = useState<PayProfileRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    companyId: "",
    employeeRefId: "",
    payProfileId: "",
    requestedBankAccountId: "",
    joinDate: "",
    periodStart: defaultPeriodStart(),
    periodEnd: defaultPeriodEnd(),
    requestedPayDate: todayDate(),
    requestedCurrencyCode: "USD",
    grossAmount: "0",
    bonusAmount: "0",
    deductionAmount: "0",
    reimbursementAmount: "0",
    socialInsuranceContributionType: "by_employee",
    socialInsuranceContributionDetails: "",
    signedFormExternalUrl: "",
    notes: "",
  });

  const [signedFormFile, setSignedFormFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [uploadedBucket, setUploadedBucket] = useState<string | null>(null);
  const [uploadedAt, setUploadedAt] = useState<string | null>(null);
  const [uploadedFileUploadId, setUploadedFileUploadId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<"draft" | "submit" | null>(null);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const selectedEmployee = useMemo(() => {
    return employeeRefs.find((row) => row.id === form.employeeRefId) || null;
  }, [employeeRefs, form.employeeRefId]);

  const selectedPayProfile = useMemo(() => {
    return payProfiles.find((row) => row.id === form.payProfileId) || null;
  }, [form.payProfileId, payProfiles]);

  const selectedCompany = useMemo(() => {
    return companies.find((row) => row.id === form.companyId) || null;
  }, [companies, form.companyId]);

  const selectedBankAccount = useMemo(() => {
    return bankAccounts.find((row) => row.id === form.requestedBankAccountId) || null;
  }, [bankAccounts, form.requestedBankAccountId]);

  const printCompany = useMemo<PrintCompanyRow | null>(() => {

      if (!selectedCompany) return null;

    return {
      id: selectedCompany.id,
      company_name: selectedCompany.name,
      legal_name: selectedCompany.legal_name,
      display_name: selectedCompany.name,
      registration_number: null,
      tax_id: null,
      email: selectedCompany.email,
      phone: selectedCompany.phone,
      address_line1: selectedCompany.address_line_1,
      address_line2: selectedCompany.address_line_2,
      city: selectedCompany.city,
      state_region: selectedCompany.state_province,
      postal_code: selectedCompany.postal_code,
      country: selectedCompany.country,
      status: selectedCompany.status,
    };
  }, [selectedCompany]);

  const filteredPayProfiles = useMemo(() => {
    if (!selectedEmployee) return [];
    return payProfiles.filter((row) => row.user_id === selectedEmployee.user_id);
  }, [payProfiles, selectedEmployee]);

  const filteredBankAccounts = useMemo(() => {
    if (!selectedCompany) return bankAccounts;

    return bankAccounts.filter((row) => {
      if (!row.company_id) return true;
      return row.company_id === selectedCompany.id;
    });
  }, [bankAccounts, selectedCompany]);

  const grossAmount = toNumber(form.grossAmount);
  const bonusAmount = toNumber(form.bonusAmount);
  const deductionAmount = toNumber(form.deductionAmount);
  const reimbursementAmount = toNumber(form.reimbursementAmount);
  const netAmount = roundMoney(
    Math.max(grossAmount + bonusAmount + reimbursementAmount - deductionAmount, 0)
  );

  const activeCurrencyCodes = useMemo(() => {
    const codes = currencies
      .filter((row) => row.status === "active")
      .map((row) => row.currency_code);

    return codes.length > 0 ? codes : ["USD"];
  }, [currencies]);

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
      setActionError(null);
      setActionMessage(null);
    },
    []
  );

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const user = authResult.data.user;

      if (!user?.id) {
        throw new Error("You must be signed in to create a paycheck request.");
      }

      setCurrentUserId(user.id);

      const [
        employeeRefsResult,
        payProfilesResult,
        currenciesResult,
        companiesResult,
        bankAccountsResult,
      ] = await Promise.all([
        supabase
          .from("finance_employee_refs")
          .select(
            [
              "id",
              "user_id",
              "code",
              "status",
              "mark",
              "metadata",
              "profile:profiles!finance_employee_refs_user_id_fkey(user_id, full_name, display_name, email)",
            ].join(", ")
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("finance_pay_profiles")
          .select(
            [
              "id",
              "profile_number",
              "user_id",
              "pay_type",
              "payment_frequency",
              "base_salary",
              "hourly_rate",
              "default_hours",
              "currency_code",
              "active",
              "status",
              "effective_from",
              "effective_to",
              "notes",
              "metadata",
            ].join(", ")
          )
          .eq("active", true)
          .eq("status", "active")
          .order("effective_from", { ascending: false }),

        supabase
          .from("finance_currencies")
          .select(
            "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status"
          )
          .eq("status", "active")
          .order("currency_code", { ascending: true }),

        supabase
          .from("finance_companies")
          .select(
            "id, name, legal_name, email, phone, currency_code, country, city, state_province, postal_code, address_line_1, address_line_2, status"
          )
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_bank_accounts")
          .select(
            "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id, beneficiary_name, iban, swift_code, account_identifier_type, account_identifier_value, is_default"
          )
          .order("is_default", { ascending: false })
          .order("name", { ascending: true }),
      ]);

      if (employeeRefsResult.error) throw employeeRefsResult.error;
      if (payProfilesResult.error) throw payProfilesResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;

      const loadedEmployeeRefs = (employeeRefsResult.data ||
        []) as unknown as EmployeeRefRow[];
      const loadedPayProfiles = (payProfilesResult.data ||
        []) as unknown as PayProfileRow[];
      const loadedCurrencies = (currenciesResult.data || []) as CurrencyRow[];
      const loadedCompanies = (companiesResult.data || []) as CompanyRow[];
      const loadedBankAccounts = (bankAccountsResult.data || []) as BankAccountRow[];

      setEmployeeRefs(loadedEmployeeRefs);
      setPayProfiles(loadedPayProfiles);
      setCurrencies(loadedCurrencies);
      setCompanies(loadedCompanies);
      setBankAccounts(loadedBankAccounts);

      const ownEmployee =
        loadedEmployeeRefs.find((row) => row.user_id === user.id) ||
        loadedEmployeeRefs[0] ||
        null;

      const ownPayProfile = ownEmployee
        ? loadedPayProfiles.find((row) => row.user_id === ownEmployee.user_id) || null
        : null;

      const defaultCompany =
        loadedCompanies.find((row) => row.currency_code === ownPayProfile?.currency_code) ||
        loadedCompanies[0] ||
        null;

      const defaultBank =
        loadedBankAccounts.find(
          (row) => row.is_default && row.company_id === defaultCompany?.id
        ) ||
        loadedBankAccounts.find((row) => row.company_id === defaultCompany?.id) ||
        loadedBankAccounts.find((row) => row.is_default) ||
        loadedBankAccounts[0] ||
        null;

      const defaultCurrency =
        ownPayProfile?.currency_code ||
        defaultCompany?.currency_code ||
        loadedCurrencies.find((row) => row.is_base_currency)?.currency_code ||
        loadedCurrencies[0]?.currency_code ||
        "USD";

      setForm((current) => ({
        ...current,
        companyId: defaultCompany?.id || current.companyId,
        employeeRefId: ownEmployee?.id || current.employeeRefId,
        payProfileId: ownPayProfile?.id || current.payProfileId,
        requestedBankAccountId: defaultBank?.id || current.requestedBankAccountId,
        requestedCurrencyCode: defaultCurrency,
        grossAmount:
          ownPayProfile?.pay_type === "hourly"
            ? String(
                roundMoney(
                  toNumber(ownPayProfile.hourly_rate) *
                    Math.max(toNumber(ownPayProfile.default_hours), 0)
                )
              )
            : String(toNumber(ownPayProfile?.base_salary)),
      }));
    } catch (error) {
      console.error("Failed to load paycheck request data:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to load paycheck request data."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!selectedEmployee) return;

    const firstProfile =
      payProfiles.find((row) => row.user_id === selectedEmployee.user_id) || null;

    if (!firstProfile) return;

    setForm((current) => {
      if (
        current.payProfileId &&
        filteredPayProfiles.some((row) => row.id === current.payProfileId)
      ) {
        return current;
      }

      return {
        ...current,
        payProfileId: firstProfile.id,
        requestedCurrencyCode: firstProfile.currency_code || current.requestedCurrencyCode,
        grossAmount:
          firstProfile.pay_type === "hourly"
            ? String(
                roundMoney(
                  toNumber(firstProfile.hourly_rate) *
                    Math.max(toNumber(firstProfile.default_hours), 0)
                )
              )
            : String(toNumber(firstProfile.base_salary)),
      };
    });
  }, [filteredPayProfiles, payProfiles, selectedEmployee]);

  useEffect(() => {
    if (!selectedPayProfile) return;

    setForm((current) => ({
      ...current,
      requestedCurrencyCode: selectedPayProfile.currency_code || current.requestedCurrencyCode,
      grossAmount:
        selectedPayProfile.pay_type === "hourly"
          ? String(
              roundMoney(
                toNumber(selectedPayProfile.hourly_rate) *
                  Math.max(toNumber(selectedPayProfile.default_hours), 0)
              )
            )
          : String(toNumber(selectedPayProfile.base_salary)),
    }));
  }, [selectedPayProfile]);

  useEffect(() => {
    if (!selectedCompany) return;

    const currentBankStillValid = filteredBankAccounts.some(
      (row) => row.id === form.requestedBankAccountId
    );

    if (currentBankStillValid) return;

    const defaultBank =
      filteredBankAccounts.find((row) => row.is_default) || filteredBankAccounts[0] || null;

    if (!defaultBank) return;

    setForm((current) => ({
      ...current,
      requestedBankAccountId: defaultBank.id,
    }));
  }, [filteredBankAccounts, form.requestedBankAccountId, selectedCompany]);

  const validateForm = useCallback(
    (submitMode: "draft" | "submit") => {
      if (!currentUserId) return "You must be signed in.";

      if (!form.companyId) {
        return "Select a company.";
      }

      if (!form.employeeRefId) {
        return "Select an employee reference.";
      }

      if (!selectedEmployee) {
        return "Selected employee reference is invalid.";
      }

      if (!form.requestedBankAccountId) {
        return "Select the requested employee bank account.";
      }

      if (!form.joinDate) {
        return "Join date is required for the payslip form.";
      }

      if (!form.periodStart) {
        return "Payroll period start date is required.";
      }

      if (!form.periodEnd) {
        return "Payroll period end date is required.";
      }

      if (new Date(form.periodEnd) < new Date(form.periodStart)) {
        return "Payroll period end date must be after the start date.";
      }

      if (!form.requestedPayDate) {
        return "Requested pay date is required.";
      }

      if (!form.requestedCurrencyCode.trim()) {
        return "Currency is required.";
      }

      if (grossAmount <= 0 && bonusAmount <= 0 && reimbursementAmount <= 0) {
        return "At least one positive amount is required.";
      }

      if (netAmount <= 0) {
        return "Net amount must be greater than 0.";
      }

      if (
        form.socialInsuranceContributionType === "by_employer" &&
        !form.socialInsuranceContributionDetails.trim()
      ) {
        return "Employer social insurance details are required when contribution is by employer.";
      }

      if (
        submitMode === "submit" &&
        !signedFormFile &&
        !uploadedPath &&
        !form.signedFormExternalUrl.trim()
      ) {
        return "Signed form upload or signed form link is required before submission.";
      }

      return null;
    },
    [
      bonusAmount,
      currentUserId,
      form.companyId,
      form.employeeRefId,
      form.joinDate,
      form.periodEnd,
      form.periodStart,
      form.requestedBankAccountId,
      form.requestedCurrencyCode,
      form.requestedPayDate,
      form.signedFormExternalUrl,
      form.socialInsuranceContributionDetails,
      form.socialInsuranceContributionType,
      grossAmount,
      netAmount,
      reimbursementAmount,
      selectedEmployee,
      signedFormFile,
      uploadedPath,
    ]
  );

  const uploadSignedFormIfNeeded = useCallback(
    async (requestId: string): Promise<UploadedSignedFormInfo> => {
      if (!signedFormFile || uploadedPath) {
        return {
          bucket: uploadedBucket,
          path: uploadedPath,
          uploadedAt,
          fileUploadId: uploadedFileUploadId,
        };
      }

      if (!selectedEmployee) {
        throw new Error("Employee reference is required before uploading form.");
      }

      const resolvedMimeType = resolveMimeType(signedFormFile);
      const extension = signedFormFile.name.split(".").pop() || "file";
      const safeCode = sanitizePathPart(selectedEmployee.code || "employee");
      const safeName = sanitizePathPart(signedFormFile.name.replace(/\.[^.]+$/, ""));
      const path = `${safeCode}/${requestId}/${Date.now()}-${safeName}.${extension}`;

      const uploadResult = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, signedFormFile, {
          cacheControl: "3600",
          contentType: resolvedMimeType,
          upsert: false,
        });

      if (uploadResult.error) throw uploadResult.error;

      const now = new Date().toISOString();

      const fileUploadResult = await supabase
        .from("file_uploads")
        .insert({
          user_id: currentUserId,
          file_name: signedFormFile.name,
          file_path: path,
          file_size: signedFormFile.size,
          mime_type: resolvedMimeType,
          entity_type: "finance_paycheck_document",
        })
        .select("id")
        .single();

      if (fileUploadResult.error) throw fileUploadResult.error;

      const attachmentResult = await supabase.from("finance_record_attachments").insert({
        entity_type: "finance_paycheck_request",
        entity_id: requestId,
        file_upload_id: fileUploadResult.data.id,
        uploaded_by: currentUserId,
        notes: "Employee signed paycheck request form",
        metadata: {
          bucket: BUCKET_NAME,
          uploaded_from: "paycheck_request_new_page",
          resolved_mime_type: resolvedMimeType,
          document_role: "employee_signed_paycheck_document",
        },
      });

      if (attachmentResult.error) throw attachmentResult.error;

      setUploadedBucket(BUCKET_NAME);
      setUploadedPath(path);
      setUploadedAt(now);
      setUploadedFileUploadId(fileUploadResult.data.id as string);

      return {
        bucket: BUCKET_NAME,
        path,
        uploadedAt: now,
        fileUploadId: fileUploadResult.data.id as string,
      };
    },
    [
      currentUserId,
      selectedEmployee,
      signedFormFile,
      uploadedAt,
      uploadedBucket,
      uploadedFileUploadId,
      uploadedPath,
    ]
  );

  const generateFilledPdfForm = useCallback(() => {
    if (!selectedEmployee) {
      setActionError("Select an employee before generating the form.");
      return;
    }

    if (!selectedCompany) {
      setActionError("Select a company before generating the form.");
      return;
    }

    if (!form.joinDate) {
      setActionError("Enter join date before generating the form.");
      return;
    }

    setActionError(null);
    setActionMessage("Print dialog opened. Choose Save as PDF if needed.");

    window.setTimeout(() => {
      window.print();
    }, 120);
  }, [form.joinDate, selectedCompany, selectedEmployee]);

        const saveRequest = useCallback(
    async (submitMode: "draft" | "submit") => {
      if (isSaving) return;

      setIsSaving(submitMode);
      setActionError(null);
      setActionMessage(null);

      try {
        const validationError = validateForm(submitMode);

        if (validationError) {
          throw new Error(validationError);
        }

        if (!currentUserId || !selectedEmployee) {
          throw new Error("Missing employee or user context.");
        }

        const requestCurrencyCode = form.requestedCurrencyCode.trim().toUpperCase();

        const companySnapshot = selectedCompany
          ? {
              company_id: selectedCompany.id,
              company_name: selectedCompany.name,
              legal_name: selectedCompany.legal_name,
              email: selectedCompany.email,
              phone: selectedCompany.phone,
              currency_code: selectedCompany.currency_code,
              address: buildCompanyAddress(selectedCompany),
              city: selectedCompany.city,
              state_province: selectedCompany.state_province,
              postal_code: selectedCompany.postal_code,
              country: selectedCompany.country,
            }
          : null;

        const requestedBankSnapshot = selectedBankAccount
          ? {
              bank_account_id: selectedBankAccount.id,
              name: selectedBankAccount.name,
              bank_name: selectedBankAccount.bank_name,
              institution_name: selectedBankAccount.institution_name,
              beneficiary_name: selectedBankAccount.beneficiary_name,
              masked_account_number: selectedBankAccount.masked_account_number,
              currency_code: selectedBankAccount.currency_code,
              iban: selectedBankAccount.iban,
              swift_code: selectedBankAccount.swift_code,
              account_identifier_type: selectedBankAccount.account_identifier_type,
              account_identifier_value: selectedBankAccount.account_identifier_value,
              display_label: buildBankLabel(selectedBankAccount),
              identifier_label: buildBankIdentifier(selectedBankAccount),
            }
          : null;

        const insertResult = await supabase
          .from("finance_paycheck_requests")
          .insert({
            employee_ref_id: selectedEmployee.id,
            employee_user_id: selectedEmployee.user_id,
            pay_profile_id: form.payProfileId || null,
            company_id: form.companyId,
            requested_bank_account_id: form.requestedBankAccountId || null,
            period_start: form.periodStart,
            period_end: form.periodEnd,
            requested_pay_date: form.requestedPayDate || null,
            requested_currency_code: requestCurrencyCode,
            requested_gross_amount: grossAmount,
            requested_bonus_amount: bonusAmount,
            requested_deduction_amount: deductionAmount,
            requested_reimbursement_amount: reimbursementAmount,
            requested_net_amount: netAmount,
            status: "draft",
            review_status: "not_submitted",
            documentation_status: "missing",
            signed_form_status: "not_uploaded",
            admin_signed_form_status: "not_uploaded",
            funding_status: "not_allocated",
            payment_status: "unpaid",
            paid_amount: 0,
            remaining_amount: netAmount,
            recipient_confirmation_status: "not_paid_yet",
            notes: form.notes.trim() || null,
            metadata: {
              source_area: "paycheck_request_new_page",
              company_snapshot: companySnapshot,
              requested_bank_snapshot: requestedBankSnapshot,
              employee_snapshot: {
                employee_ref_id: selectedEmployee.id,
                employee_user_id: selectedEmployee.user_id,
                employee_code: selectedEmployee.code,
                employee_mark: selectedEmployee.mark,
                employee_label: buildEmployeeLabel(selectedEmployee),
                employee_sub_label: buildEmployeeSubLabel(selectedEmployee),
              },
              pay_profile_snapshot: selectedPayProfile
                ? {
                    pay_profile_id: selectedPayProfile.id,
                    profile_number: selectedPayProfile.profile_number,
                    pay_type: selectedPayProfile.pay_type,
                    payment_frequency: selectedPayProfile.payment_frequency,
                    base_salary: selectedPayProfile.base_salary,
                    hourly_rate: selectedPayProfile.hourly_rate,
                    default_hours: selectedPayProfile.default_hours,
                    currency_code: selectedPayProfile.currency_code,
                    effective_from: selectedPayProfile.effective_from,
                    effective_to: selectedPayProfile.effective_to,
                  }
                : null,
              payslip_form_snapshot: {
                company_id: form.companyId,
                company_label: buildCompanyLabel(selectedCompany),
                join_date: form.joinDate,
                position: selectedEmployee.mark ? formatLabel(selectedEmployee.mark) : null,
                social_insurance_contribution_type: form.socialInsuranceContributionType,
                social_insurance_contribution_label:
                  form.socialInsuranceContributionType === "by_employer"
                    ? "By Employer"
                    : "By Employee",
                social_insurance_contribution_details:
                  form.socialInsuranceContributionDetails.trim() || null,
                form_type: "prc_pay_slip",
                generated_from_page: true,
              },
              requested_amounts: {
                gross: grossAmount,
                bonus: bonusAmount,
                deduction: deductionAmount,
                reimbursement: reimbursementAmount,
                net: netAmount,
                currency_code: requestCurrencyCode,
              },
              form_template: {
                downloadable_pdf_available: true,
                generated_from_page: true,
              },
            },
            created_by: currentUserId,
            updated_by: currentUserId,
          })
          .select("id")
          .single();

        if (insertResult.error) throw insertResult.error;

        const requestId = insertResult.data.id as string;
        const uploadInfo = await uploadSignedFormIfNeeded(requestId);

        const documentationStatus =
          uploadInfo.path && form.signedFormExternalUrl.trim()
            ? "files_and_links"
            : uploadInfo.path
              ? "uploaded"
              : form.signedFormExternalUrl.trim()
                ? "linked"
                : "missing";

        const signedFormStatus =
          uploadInfo.path || form.signedFormExternalUrl.trim()
            ? submitMode === "submit"
              ? "submitted"
              : "uploaded"
            : "not_uploaded";

        const updateResult = await supabase
          .from("finance_paycheck_requests")
          .update({
            documentation_status: documentationStatus,
            signed_form_status: signedFormStatus,
            signed_form_storage_bucket: uploadInfo.bucket,
            signed_form_storage_path: uploadInfo.path,
            signed_form_external_url: form.signedFormExternalUrl.trim() || null,
            signed_form_uploaded_at: uploadInfo.uploadedAt,
            signed_form_submitted_at:
              submitMode === "submit" ? new Date().toISOString() : null,
            updated_by: currentUserId,
            metadata: {
              source_area: "paycheck_request_new_page",
              company_snapshot: companySnapshot,
              requested_bank_snapshot: requestedBankSnapshot,
              employee_snapshot: {
                employee_ref_id: selectedEmployee.id,
                employee_user_id: selectedEmployee.user_id,
                employee_code: selectedEmployee.code,
                employee_mark: selectedEmployee.mark,
                employee_label: buildEmployeeLabel(selectedEmployee),
                employee_sub_label: buildEmployeeSubLabel(selectedEmployee),
              },
              pay_profile_snapshot: selectedPayProfile
                ? {
                    pay_profile_id: selectedPayProfile.id,
                    profile_number: selectedPayProfile.profile_number,
                    pay_type: selectedPayProfile.pay_type,
                    payment_frequency: selectedPayProfile.payment_frequency,
                    base_salary: selectedPayProfile.base_salary,
                    hourly_rate: selectedPayProfile.hourly_rate,
                    default_hours: selectedPayProfile.default_hours,
                    currency_code: selectedPayProfile.currency_code,
                    effective_from: selectedPayProfile.effective_from,
                    effective_to: selectedPayProfile.effective_to,
                  }
                : null,
              payslip_form_snapshot: {
                company_id: form.companyId,
                company_label: buildCompanyLabel(selectedCompany),
                join_date: form.joinDate,
                position: selectedEmployee.mark ? formatLabel(selectedEmployee.mark) : null,
                social_insurance_contribution_type: form.socialInsuranceContributionType,
                social_insurance_contribution_label:
                  form.socialInsuranceContributionType === "by_employer"
                    ? "By Employer"
                    : "By Employee",
                social_insurance_contribution_details:
                  form.socialInsuranceContributionDetails.trim() || null,
                form_type: "prc_pay_slip",
                generated_from_page: true,
              },
              requested_amounts: {
                gross: grossAmount,
                bonus: bonusAmount,
                deduction: deductionAmount,
                reimbursement: reimbursementAmount,
                net: netAmount,
                currency_code: requestCurrencyCode,
              },
              form_template: {
                downloadable_pdf_available: true,
                generated_from_page: true,
              },
              signed_form_upload: {
                bucket: uploadInfo.bucket,
                path: uploadInfo.path,
                external_url: form.signedFormExternalUrl.trim() || null,
                file_upload_id: uploadInfo.fileUploadId,
                uploaded_at: uploadInfo.uploadedAt,
                submitted_at: submitMode === "submit" ? new Date().toISOString() : null,
              },
            },
          })
          .eq("id", requestId);

        if (updateResult.error) throw updateResult.error;

        if (submitMode === "submit") {
          const submitResult = await supabase.rpc("finance_submit_paycheck_request", {
            p_request_id: requestId,
            p_actor_user_id: currentUserId,
          });

          if (submitResult.error) throw submitResult.error;
        }

        setActionMessage(
          submitMode === "submit"
            ? "Paycheck request submitted to Finance review."
            : "Paycheck request saved as draft."
        );

        navigate(`/finance/transactions/paycheck-requests/${requestId}`);
      } catch (error) {
        console.error("Failed to save paycheck request:", error);
        setActionError(
          error instanceof Error ? error.message : "Failed to save paycheck request."
        );
      } finally {
        setIsSaving(null);
      }
    },
    [
      bonusAmount,
      currentUserId,
      deductionAmount,
      form.companyId,
      form.joinDate,
      form.notes,
      form.payProfileId,
      form.periodEnd,
      form.periodStart,
      form.requestedBankAccountId,
      form.requestedCurrencyCode,
      form.requestedPayDate,
      form.signedFormExternalUrl,
      form.socialInsuranceContributionDetails,
      form.socialInsuranceContributionType,
      grossAmount,
      isSaving,
      navigate,
      netAmount,
      reimbursementAmount,
      selectedBankAccount,
      selectedCompany,
      selectedEmployee,
      selectedPayProfile,
      uploadSignedFormIfNeeded,
      validateForm,
    ]
  );

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/paycheck-requests")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Paycheck Requests
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-stretch">
              <div className="min-w-0">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <FileSignature className="h-3.5 w-3.5" />
                  New Paycheck Request
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Create Paycheck Request
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Create an employee paycheck request, pull pay profile defaults, generate the
                  filled payslip form, upload the employee-signed form, and submit it to
                  Finance/Admin review.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Employee Request
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    Pay Profile Defaults
                  </div>
                  <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                    Filled Payslip Form
                  </div>
                  <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                    Employee Signature Required
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <SummaryBlock
                  label="Net Requested"
                  value={`${form.requestedCurrencyCode || "USD"} ${formatMoney(netAmount)}`}
                  detail="Gross + bonus + reimbursement − deduction."
                />
                <SummaryBlock
                  label="Selected Employee"
                  value={buildEmployeeLabel(selectedEmployee)}
                  detail={buildEmployeeSubLabel(selectedEmployee)}
                />
              </div>
            </div>
          </div>
        </header>

        {actionError ? (
          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {actionError}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
            {actionMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-12 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
            <div className="mt-4 text-sm text-slate-400">
              Loading paycheck request data...
            </div>
          </div>
        ) : (
          <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="grid gap-6">

                            <SectionCard
                title="Company & Employee"
                description="Select the company, employee reference, and requested payment destination for this paycheck request."
                icon={Building2}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectShell
                    label="Company"
                    value={form.companyId}
                    onChange={(value) => updateField("companyId", value)}
                    disabled={Boolean(isSaving)}
                  >
                    <option value="">Select company</option>
                    {companies.map((row) => (
                      <option key={row.id} value={row.id}>
                        {buildCompanyLabel(row)} — {buildCompanySubLabel(row)}
                      </option>
                    ))}
                  </SelectShell>

                  <div className="grid gap-2">
                    <span className={labelClass()}>Employee Reference</span>

                    <button
                      type="button"
                      disabled={Boolean(isSaving)}
                      onClick={() => setEmployeePickerOpen((current) => !current)}
                      className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 text-left text-sm text-white outline-none transition hover:border-cyan-400/20 hover:bg-black/30 focus:border-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="min-w-0 truncate">
                        {selectedEmployee
                          ? `${buildEmployeeLabel(selectedEmployee)} — ${buildEmployeeSubLabel(
                              selectedEmployee
                            )}`
                          : "Select employee"}
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {employeePickerOpen ? "Close" : "Open"}
                      </span>
                    </button>

                    {employeePickerOpen ? (
                      <div className="max-h-[320px] overflow-y-auto rounded-2xl border border-white/10 bg-[#080b12] p-2 shadow-2xl shadow-black/40">
                        <button
                          type="button"
                          onClick={() => {
                            updateField("employeeRefId", "");
                            updateField("payProfileId", "");
                            setEmployeePickerOpen(false);
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                        >
                          <span>Select employee</span>
                        </button>

                        {employeeRefs.map((row) => {
                          const isSelected = row.id === form.employeeRefId;

                          return (
                            <button
                              key={row.id}
                              type="button"
                              onClick={() => {
                                updateField("employeeRefId", row.id);
                                updateField("payProfileId", "");
                                setEmployeePickerOpen(false);
                              }}
                              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                                isSelected
                                  ? "bg-cyan-500/10 text-cyan-100"
                                  : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">
                                  {buildEmployeeLabel(row)}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-slate-500">
                                  {buildEmployeeSubLabel(row)}
                                </span>
                              </span>

                              {isSelected ? (
                                <span className="shrink-0 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                                  Selected
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <SelectShell
                    label="Requested Payment Bank"
                    value={form.requestedBankAccountId}
                    onChange={(value) => updateField("requestedBankAccountId", value)}
                    disabled={Boolean(isSaving)}
                  >
                    <option value="">Select requested bank account</option>
                    {filteredBankAccounts.map((row) => (
                      <option key={row.id} value={row.id}>
                        {buildBankLabel(row)} — {buildBankIdentifier(row)}
                      </option>
                    ))}
                  </SelectShell>

                  <SummaryBlock
                    label="Requested Bank"
                    value={buildBankLabel(selectedBankAccount)}
                    detail={buildBankIdentifier(selectedBankAccount)}
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <SummaryBlock
                    label="Selected Company"
                    value={buildCompanyLabel(selectedCompany)}
                    detail={buildCompanySubLabel(selectedCompany)}
                  />
                  <SummaryBlock
                    label="Employee"
                    value={buildEmployeeLabel(selectedEmployee)}
                    detail={buildEmployeeSubLabel(selectedEmployee)}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Pay Profile Defaults"
                description="Select the employee pay profile used to fill salary, frequency, currency, and gross amount defaults."
                icon={UserRound}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectShell
                    label="Pay Profile"
                    value={form.payProfileId}
                    onChange={(value) => updateField("payProfileId", value)}
                    disabled={Boolean(isSaving)}
                  >
                    <option value="">Select pay profile</option>
                    {filteredPayProfiles.map((row) => (
                      <option key={row.id} value={row.id}>
                        {buildPayProfileLabel(row)}
                      </option>
                    ))}
                  </SelectShell>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Join Date</span>
                    <input
                      type="date"
                      value={form.joinDate}
                      disabled={Boolean(isSaving)}
                      onChange={(event) => updateField("joinDate", event.target.value)}
                      className={inputClass()}
                    />
                  </label>
                </div>

                {selectedEmployee && filteredPayProfiles.length === 0 ? (
                  <div className="mt-4 rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4">
                    <div className="text-sm font-semibold text-amber-100">
                      No active pay profile found for this employee.
                    </div>
                    <p className="mt-2 text-xs leading-5 text-amber-100/75">
                      You can still enter paycheck amounts manually, but Finance/Admin should create
                      the employee pay profile from Finance Master Data → Employees so future
                      requests auto-fill correctly.
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <SummaryBlock
                    label="Pay Type"
                    value={formatLabel(selectedPayProfile?.pay_type)}
                    detail="Pulled from employee pay profile."
                  />
                  <SummaryBlock
                    label="Frequency"
                    value={formatLabel(selectedPayProfile?.payment_frequency)}
                    detail="Pulled from employee pay profile."
                  />
                  <SummaryBlock
                    label="Profile Currency"
                    value={selectedPayProfile?.currency_code || "—"}
                    detail="Used as the default request currency."
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Payroll Period"
                description="Define the payroll period and requested pay date."
                icon={CalendarDays}
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="grid gap-2">
                    <span className={labelClass()}>Period Start</span>
                    <input
                      type="date"
                      value={form.periodStart}
                      disabled={Boolean(isSaving)}
                      onChange={(event) => updateField("periodStart", event.target.value)}
                      className={inputClass()}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Period End</span>
                    <input
                      type="date"
                      value={form.periodEnd}
                      disabled={Boolean(isSaving)}
                      onChange={(event) => updateField("periodEnd", event.target.value)}
                      className={inputClass()}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Requested Pay Date</span>
                    <input
                      type="date"
                      value={form.requestedPayDate}
                      disabled={Boolean(isSaving)}
                      onChange={(event) => updateField("requestedPayDate", event.target.value)}
                      className={inputClass()}
                    />
                  </label>
                </div>
              </SectionCard>

              <SectionCard
                title="Paycheck Amounts"
                description="Enter the requested amounts. Net amount is calculated automatically."
                icon={WalletCards}
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <SelectShell
                    label="Currency"
                    value={form.requestedCurrencyCode}
                    onChange={(value) => updateField("requestedCurrencyCode", value)}
                    disabled={Boolean(isSaving)}
                  >
                    {activeCurrencyCodes.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </SelectShell>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Gross Amount</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.grossAmount}
                      disabled={Boolean(isSaving)}
                      onChange={(event) => updateField("grossAmount", event.target.value)}
                      className={inputClass()}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Bonus</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.bonusAmount}
                      disabled={Boolean(isSaving)}
                      onChange={(event) => updateField("bonusAmount", event.target.value)}
                      className={inputClass()}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Deduction</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.deductionAmount}
                      disabled={Boolean(isSaving)}
                      onChange={(event) => updateField("deductionAmount", event.target.value)}
                      className={inputClass()}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Reimbursement</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.reimbursementAmount}
                      disabled={Boolean(isSaving)}
                      onChange={(event) =>
                        updateField("reimbursementAmount", event.target.value)
                      }
                      className={inputClass()}
                    />
                  </label>
                </div>

                <div className="mt-4 rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 px-5 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                    Calculated Net Amount
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    {form.requestedCurrencyCode || "USD"} {formatMoney(netAmount)}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-cyan-100/70">
                    Formula: gross + bonus + reimbursement − deduction.
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Social Insurance"
                description="Select how social insurance contribution should appear on the filled payslip form."
                icon={ShieldCheck}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectShell
                    label="Social Insurance Contribution"
                    value={form.socialInsuranceContributionType}
                    onChange={(value) =>
                      updateField(
                        "socialInsuranceContributionType",
                        value as SocialInsuranceContributionType
                      )
                    }
                    disabled={Boolean(isSaving)}
                  >
                    <option value="by_employee">By Employee</option>
                    <option value="by_employer">By Employer</option>
                  </SelectShell>

                  {form.socialInsuranceContributionType === "by_employer" ? (
                    <label className="grid gap-2">
                      <span className={labelClass()}>Employer Contribution Details</span>
                      <input
                        value={form.socialInsuranceContributionDetails}
                        disabled={Boolean(isSaving)}
                        onChange={(event) =>
                          updateField("socialInsuranceContributionDetails", event.target.value)
                        }
                        placeholder="Enter employer social insurance details"
                        className={inputClass()}
                      />
                    </label>
                  ) : (
                    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        PDF Form Output
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">By Employee</div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">
                        The payslip form will mark social insurance contribution as employee-paid.
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

                            <SectionCard
                title="Signed Form"
                description="Generate the filled payslip form, save/sign it, then upload the employee-signed form or provide a signed-form link."
                icon={UploadCloud}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="grid gap-4">
                    <button
                      type="button"
                      onClick={generateFilledPdfForm}
                      disabled={!selectedEmployee || !selectedCompany || Boolean(isSaving)}
                      className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      Generate Filled PDF Form
                    </button>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Upload Employee-Signed Form</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                        disabled={Boolean(isSaving)}
                        onChange={(event) =>
                          setSignedFormFile(event.target.files?.[0] || null)
                        }
                        className="block w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-100 hover:file:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Signed Form Link</span>
                      <div className="relative">
                        <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          value={form.signedFormExternalUrl}
                          disabled={Boolean(isSaving)}
                          onChange={(event) =>
                            updateField("signedFormExternalUrl", event.target.value)
                          }
                          placeholder="Paste signed form link if stored externally"
                          className={`${inputClass()} pl-11`}
                        />
                      </div>
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Notes</span>
                      <textarea
                        value={form.notes}
                        disabled={Boolean(isSaving)}
                        onChange={(event) => updateField("notes", event.target.value)}
                        placeholder="Optional notes for Finance/Admin review"
                        className={textareaClass()}
                      />
                    </label>
                  </div>

                  <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4">
                    <div className="text-sm font-semibold text-amber-100">
                      Employee-signed form required for submission
                    </div>
                    <p className="mt-2 text-xs leading-5 text-amber-100/75">
                      Generate the filled payslip form, save as PDF or print it, sign it as the
                      employee, then upload the signed file. Drafts can be saved without a signed
                      form. Submission requires an uploaded signed form or external signed-form link.
                    </p>
                    <div className="mt-4 text-xs leading-5 text-amber-100/75">
                      Bucket: {BUCKET_NAME}
                    </div>
                    {signedFormFile ? (
                      <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        Selected: {signedFormFile.name}
                      </div>
                    ) : null}
                    {uploadedPath ? (
                      <div className="mt-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                        Uploaded: {uploadedPath}
                      </div>
                    ) : null}
                  </div>
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
                    Save draft or submit the signed request to Finance/Admin review.
                  </p>
                </div>

                <div className="grid gap-4 p-5">
                  <SummaryBlock
                    label="Company"
                    value={buildCompanyLabel(selectedCompany)}
                    detail={buildCompanySubLabel(selectedCompany)}
                  />

                  <SummaryBlock
                    label="Employee"
                    value={buildEmployeeLabel(selectedEmployee)}
                    detail={buildEmployeeSubLabel(selectedEmployee)}
                  />

                  <SummaryBlock
                    label="Requested Bank"
                    value={buildBankLabel(selectedBankAccount)}
                    detail={buildBankIdentifier(selectedBankAccount)}
                  />

                  <SummaryBlock
                    label="Period"
                    value={`${formatDate(form.periodStart)} → ${formatDate(form.periodEnd)}`}
                    detail={`Requested pay date: ${formatDate(form.requestedPayDate)}`}
                  />

                  <SummaryBlock
                    label="Net Paycheck Request"
                    value={`${form.requestedCurrencyCode || "USD"} ${formatMoney(netAmount)}`}
                    detail="Calculated from the amount fields."
                  />

                  <SummaryBlock
                    label="Social Insurance"
                    value={
                      form.socialInsuranceContributionType === "by_employer"
                        ? "By Employer"
                        : "By Employee"
                    }
                    detail={
                      form.socialInsuranceContributionType === "by_employer"
                        ? form.socialInsuranceContributionDetails || "Details required."
                        : "Employee-paid contribution option."
                    }
                  />

                  <SummaryBlock
                    label="Employee Signed Form"
                    value={
                      signedFormFile || uploadedPath || form.signedFormExternalUrl.trim()
                        ? "Ready"
                        : "Missing"
                    }
                    detail="Required before submitting to Finance/Admin review."
                  />

                  <div className="grid gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => void saveRequest("submit")}
                      disabled={Boolean(isSaving) || isLoading}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving === "submit" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {isSaving === "submit"
                        ? "Submitting..."
                        : "Submit To Finance Review"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void saveRequest("draft")}
                      disabled={Boolean(isSaving) || isLoading}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving === "draft" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSaving === "draft" ? "Saving..." : "Save Draft"}
                    </button>
                  </div>
                </div>
              </section>
            </aside>
          </section>
        )}
      </div>

      <PaycheckRequestPrintDocument
        company={printCompany}
        employee={selectedEmployee}
        payProfile={selectedPayProfile}
        joinDate={form.joinDate}
        periodStart={form.periodStart}
        periodEnd={form.periodEnd}
        requestedPayDate={form.requestedPayDate}
        requestedCurrencyCode={form.requestedCurrencyCode || "USD"}
        grossAmount={grossAmount}
        bonusAmount={bonusAmount}
        deductionAmount={deductionAmount}
        reimbursementAmount={reimbursementAmount}
        netAmount={netAmount}
        socialInsuranceContributionType={form.socialInsuranceContributionType}
        socialInsuranceContributionDetails={form.socialInsuranceContributionDetails}
      />
    </div>
  );
}
