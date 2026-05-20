import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  Download,
  FileSignature,
  Loader2,
  Save,
  Send,
  ShieldCheck,
  UploadCloud,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  AixiaAlert,
  AixiaButton,
  AixiaDocumentUploadPanel,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  FinancePage,
  AixiaReviewGrid,
  AixiaSection,
  AixiaSelectField,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";
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

type PaymentTransferMethod =
  | "bank_transfer"
  | "cash"
  | "digital_wallet"
  | "company_method"
  | "other";

type FormState = {
  companyId: string;
  employeeRefId: string;
  payProfileId: string;
  joinDate: string;
  periodStart: string;
  periodEnd: string;
  requestedPayDate: string;
  requestedCurrencyCode: string;
  grossAmount: string;
  bonusAmount: string;
  deductionAmount: string;
  reimbursementAmount: string;
  paymentTransferMethod: PaymentTransferMethod;
  paymentTransferInstructions: string;
  paymentTransferContact: string;
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

const PAYMENT_TRANSFER_METHODS: Array<{
  value: PaymentTransferMethod;
  label: string;
  helper: string;
}> = [
  {
    value: "bank_transfer",
    label: "Bank Transfer",
    helper:
      "Employee provides bank, account, beneficiary, IBAN, SWIFT, or other transfer details for Finance review.",
  },
  {
    value: "digital_wallet",
    label: "Digital Wallet",
    helper:
      "Employee provides wallet type, account ID, phone, email, or payment handle.",
  },
  {
    value: "cash",
    label: "Cash",
    helper: "Employee requests cash payment where allowed by company policy.",
  },
  {
    value: "company_method",
    label: "Company Default Method",
    helper: "Finance/Admin will use the company’s existing payroll payment method.",
  },
  {
    value: "other",
    label: "Other",
    helper: "Employee writes a custom payment preference for Finance/Admin review.",
  },
];

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

function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
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

function getTransferMethodLabel(value: PaymentTransferMethod | string | null | undefined) {
  return (
    PAYMENT_TRANSFER_METHODS.find((method) => method.value === value)?.label ||
    formatLabel(value)
  );
}

function getTransferMethodHelper(value: PaymentTransferMethod | string | null | undefined) {
  return (
    PAYMENT_TRANSFER_METHODS.find((method) => method.value === value)?.helper ||
    "Finance/Admin will review this payment preference."
  );
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

export default function NewPaycheckRequestPage() {
  const navigate = useNavigate();

  const [employeeRefs, setEmployeeRefs] = useState<EmployeeRefRow[]>([]);
  const [payProfiles, setPayProfiles] = useState<PayProfileRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    companyId: "",
    employeeRefId: "",
    payProfileId: "",
    joinDate: "",
    periodStart: defaultPeriodStart(),
    periodEnd: defaultPeriodEnd(),
    requestedPayDate: todayDate(),
    requestedCurrencyCode: "USD",
    grossAmount: "0",
    bonusAmount: "0",
    deductionAmount: "0",
    reimbursementAmount: "0",
    paymentTransferMethod: "bank_transfer",
    paymentTransferInstructions: "",
    paymentTransferContact: "",
    socialInsuranceContributionType: "by_employee",
    socialInsuranceContributionDetails: "",
    signedFormExternalUrl: "",
    notes: "",
  });

  const [signedFormFile, setSignedFormFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [uploadedBucket, setUploadedBucket] = useState<string | null>(null);
  const [uploadedAt, setUploadedAt] = useState<string | null>(null);
  const [uploadedFileUploadId, setUploadedFileUploadId] = useState<string | null>(
    null
  );

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

      const [employeeRefsResult, payProfilesResult, currenciesResult, companiesResult] =
        await Promise.all([
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
        ]);

      if (employeeRefsResult.error) throw employeeRefsResult.error;
      if (payProfilesResult.error) throw payProfilesResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (companiesResult.error) throw companiesResult.error;

      const loadedEmployeeRefs = (employeeRefsResult.data ||
        []) as unknown as EmployeeRefRow[];
      const loadedPayProfiles = (payProfilesResult.data ||
        []) as unknown as PayProfileRow[];
      const loadedCurrencies = (currenciesResult.data || []) as CurrencyRow[];
      const loadedCompanies = (companiesResult.data || []) as CompanyRow[];

      setEmployeeRefs(loadedEmployeeRefs);
      setPayProfiles(loadedPayProfiles);
      setCurrencies(loadedCurrencies);
      setCompanies(loadedCompanies);

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
      requestedCurrencyCode:
        selectedPayProfile.currency_code || current.requestedCurrencyCode,
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
        form.paymentTransferMethod !== "company_method" &&
        !form.paymentTransferInstructions.trim()
      ) {
        return "Write how you would like the paycheck money transferred.";
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
      form.paymentTransferInstructions,
      form.paymentTransferMethod,
      form.periodEnd,
      form.periodStart,
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

      const attachmentResult = await supabase
        .from("finance_record_attachments")
        .insert({
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

        const paymentPreferenceSnapshot = {
          method: form.paymentTransferMethod,
          method_label: getTransferMethodLabel(form.paymentTransferMethod),
          instructions:
            form.paymentTransferMethod === "company_method"
              ? null
              : form.paymentTransferInstructions.trim(),
          contact: form.paymentTransferContact.trim() || null,
          submitted_by_employee: true,
          reviewed_by_finance: false,
          note:
            "Employee-provided payment preference only. This is not a company bank account selection.",
        };

        const baseMetadata = {
          source_area: "paycheck_request_new_page",
          company_snapshot: companySnapshot,
          employee_payment_preference: paymentPreferenceSnapshot,
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
        };

        const insertResult = await supabase
          .from("finance_paycheck_requests")
          .insert({
            employee_ref_id: selectedEmployee.id,
            employee_user_id: selectedEmployee.user_id,
            pay_profile_id: form.payProfileId || null,
            company_id: form.companyId,
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
            metadata: baseMetadata,
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
              ...baseMetadata,
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
      form.paymentTransferContact,
      form.paymentTransferInstructions,
      form.paymentTransferMethod,
      form.periodEnd,
      form.periodStart,
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
      selectedCompany,
      selectedEmployee,
      selectedPayProfile,
      uploadSignedFormIfNeeded,
      validateForm,
    ]
  );

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading paycheck request data"
        description="Employee references, pay profiles, active currencies, and companies are being loaded."
      />
    );
  }

        return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Paycheck Requests"
        parentPath="/finance/transactions/paycheck-requests"
        gradientTitle="Create Paycheck"
        title="Request"
        subtitle="Employee paycheck request draft"
        />

      <div className="aixia-command-scroll">
{actionError ? <AixiaAlert tone="error">{actionError}</AixiaAlert> : null}
      {actionMessage ? <AixiaAlert tone="success">{actionMessage}</AixiaAlert> : null}

      <div className="aixia-grid-with-side">
        <div className="aixia-stack">
          <AixiaSection
            title="Company & Employee"
            description="Select the company and employee reference for this paycheck request."
            icon={Building2}
          >
            <AixiaFormGrid columns="two">
              <AixiaFormField>
                <AixiaFieldLabel label="Company" required />
                <AixiaSelectField
                  value={form.companyId}
                  disabled={Boolean(isSaving)}
                  onChange={(event) => updateField("companyId", event.target.value)}
                >
                  <option value="" className="bg-[#05070d]">
                    Select company
                  </option>
                  {companies.map((row) => (
                    <option key={row.id} value={row.id} className="bg-[#05070d]">
                      {buildCompanyLabel(row)} — {buildCompanySubLabel(row)}
                    </option>
                  ))}
                </AixiaSelectField>
              </AixiaFormField>

              <AixiaFormField>
                <AixiaFieldLabel label="Employee Reference" required />
                <AixiaButton
                  type="button"
                  variant="secondary"
                  disabled={Boolean(isSaving)}
                  onClick={() => setEmployeePickerOpen((current) => !current)}
                >
                  <UserRound className="h-4 w-4" />
                  {selectedEmployee
                    ? `${buildEmployeeLabel(selectedEmployee)} — ${buildEmployeeSubLabel(
                        selectedEmployee
                      )}`
                    : "Select employee"}
                </AixiaButton>

                {employeePickerOpen ? (
                  <div className="aixia-picker-panel">
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        updateField("employeeRefId", "");
                        updateField("payProfileId", "");
                        setEmployeePickerOpen(false);
                      }}
                    >
                      Select employee
                    </AixiaButton>

                    {employeeRefs.map((row) => {
                      const isSelected = row.id === form.employeeRefId;

                      return (
                        <AixiaButton
                          key={row.id}
                          type="button"
                          variant={isSelected ? "primary" : "secondary"}
                          onClick={() => {
                            updateField("employeeRefId", row.id);
                            updateField("payProfileId", "");
                            setEmployeePickerOpen(false);
                          }}
                        >
                          <UserRound className="h-4 w-4" />
                          {buildEmployeeLabel(row)} — {buildEmployeeSubLabel(row)}
                        </AixiaButton>
                      );
                    })}
                  </div>
                ) : null}
              </AixiaFormField>
            </AixiaFormGrid>

            <AixiaReviewGrid variant="cards">
              <AixiaValueBlock
                label="Selected Company"
                value={buildCompanyLabel(selectedCompany)}
                detail={buildCompanySubLabel(selectedCompany)}
              />
              <AixiaValueBlock
                label="Employee"
                value={buildEmployeeLabel(selectedEmployee)}
                detail={buildEmployeeSubLabel(selectedEmployee)}
              />
            </AixiaReviewGrid>
          </AixiaSection>

          <AixiaSection
            title="Employee Payment Preference"
            description="The employee writes how they would like the paycheck money transferred. This does not expose company bank accounts."
            icon={WalletCards}
          >
            <AixiaFormGrid columns="two">
              <AixiaFormField>
                <AixiaFieldLabel label="Preferred Transfer Method" required />
                <AixiaSelectField
                  value={form.paymentTransferMethod}
                  disabled={Boolean(isSaving)}
                  onChange={(event) =>
                    updateField(
                      "paymentTransferMethod",
                      event.target.value as PaymentTransferMethod
                    )
                  }
                >
                  {PAYMENT_TRANSFER_METHODS.map((method) => (
                    <option
                      key={method.value}
                      value={method.value}
                      className="bg-[#05070d]"
                    >
                      {method.label}
                    </option>
                  ))}
                </AixiaSelectField>
              </AixiaFormField>

              <AixiaValueBlock
                label="Finance Visibility"
                value={getTransferMethodLabel(form.paymentTransferMethod)}
                detail={getTransferMethodHelper(form.paymentTransferMethod)}
              />
            </AixiaFormGrid>

            {form.paymentTransferMethod !== "company_method" ? (
              <AixiaFormGrid columns="two">
                <AixiaFormField>
                  <AixiaFieldLabel label="Transfer Instructions" required />
                  <AixiaTextareaField
                    value={form.paymentTransferInstructions}
                    disabled={Boolean(isSaving)}
                    onChange={(event) =>
                      updateField("paymentTransferInstructions", event.target.value)
                    }
                    placeholder="Example: Bank name, beneficiary name, account/IBAN/SWIFT, wallet ID, phone, email, or other transfer details."
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Transfer Contact / Confirmation" />
                  <AixiaTextareaField
                    value={form.paymentTransferContact}
                    disabled={Boolean(isSaving)}
                    onChange={(event) =>
                      updateField("paymentTransferContact", event.target.value)
                    }
                    placeholder="Optional: phone, email, WeChat, WhatsApp, or confirmation notes for Finance/Admin."
                  />
                </AixiaFormField>
              </AixiaFormGrid>
            ) : (
              <AixiaAlert tone="info">
                Finance/Admin will use the company’s existing payroll payment method.
                No bank account details are selected or exposed on this requester page.
              </AixiaAlert>
            )}

            <AixiaAlert tone="info">
              This section captures the employee’s preferred receiving method for Finance
              review. It is not connected to internal company bank-account master data and
              does not execute payment.
            </AixiaAlert>
          </AixiaSection>

          <AixiaSection
            title="Pay Profile Defaults"
            description="Select the employee pay profile used to fill salary, frequency, currency, and gross amount defaults."
            icon={UserRound}
          >
            <AixiaFormGrid columns="two">
              <AixiaFormField>
                <AixiaFieldLabel label="Pay Profile" />
                <AixiaSelectField
                  value={form.payProfileId}
                  disabled={Boolean(isSaving)}
                  onChange={(event) => updateField("payProfileId", event.target.value)}
                >
                  <option value="" className="bg-[#05070d]">
                    Select pay profile
                  </option>
                  {filteredPayProfiles.map((row) => (
                    <option key={row.id} value={row.id} className="bg-[#05070d]">
                      {buildPayProfileLabel(row)}
                    </option>
                  ))}
                </AixiaSelectField>
              </AixiaFormField>

              <AixiaFormField>
                <AixiaFieldLabel label="Join Date" required />
                <AixiaInputField
                  type="date"
                  value={form.joinDate}
                  disabled={Boolean(isSaving)}
                  onChange={(event) => updateField("joinDate", event.target.value)}
                />
              </AixiaFormField>
            </AixiaFormGrid>

            {selectedEmployee && filteredPayProfiles.length === 0 ? (
              <AixiaAlert tone="info">
                No active pay profile found for this employee. You can still enter paycheck
                amounts manually, but Finance/Admin should create the employee pay profile
                from Finance Master Data → Employees so future requests auto-fill correctly.
              </AixiaAlert>
            ) : null}

            <AixiaReviewGrid variant="cards">
              <AixiaValueBlock
                label="Pay Type"
                value={formatLabel(selectedPayProfile?.pay_type)}
                detail="Pulled from employee pay profile."
              />
              <AixiaValueBlock
                label="Frequency"
                value={formatLabel(selectedPayProfile?.payment_frequency)}
                detail="Pulled from employee pay profile."
              />
              <AixiaValueBlock
                label="Profile Currency"
                value={selectedPayProfile?.currency_code || "—"}
                detail="Used as the default request currency."
              />
            </AixiaReviewGrid>
          </AixiaSection>

          <AixiaSection
            title="Payroll Period"
            description="Define the payroll period and requested pay date."
            icon={CalendarDays}
          >
            <AixiaFormGrid columns="three">
              <AixiaFormField>
                <AixiaFieldLabel label="Period Start" required />
                <AixiaInputField
                  type="date"
                  value={form.periodStart}
                  disabled={Boolean(isSaving)}
                  onChange={(event) => updateField("periodStart", event.target.value)}
                />
              </AixiaFormField>

              <AixiaFormField>
                <AixiaFieldLabel label="Period End" required />
                <AixiaInputField
                  type="date"
                  value={form.periodEnd}
                  disabled={Boolean(isSaving)}
                  onChange={(event) => updateField("periodEnd", event.target.value)}
                />
              </AixiaFormField>

              <AixiaFormField>
                <AixiaFieldLabel label="Requested Pay Date" required />
                <AixiaInputField
                  type="date"
                  value={form.requestedPayDate}
                  disabled={Boolean(isSaving)}
                  onChange={(event) =>
                    updateField("requestedPayDate", event.target.value)
                  }
                />
              </AixiaFormField>
            </AixiaFormGrid>
          </AixiaSection>

                    <AixiaSection
            title="Paycheck Amounts"
            description="Enter the requested amounts. Net amount is calculated automatically."
            icon={WalletCards}
          >
            <AixiaFormGrid columns="three">
              <AixiaFormField>
                <AixiaFieldLabel label="Currency" required />
                <AixiaSelectField
                  value={form.requestedCurrencyCode}
                  disabled={Boolean(isSaving)}
                  onChange={(event) =>
                    updateField("requestedCurrencyCode", event.target.value)
                  }
                >
                  {activeCurrencyCodes.map((code) => (
                    <option key={code} value={code} className="bg-[#05070d]">
                      {code}
                    </option>
                  ))}
                </AixiaSelectField>
              </AixiaFormField>

              <AixiaFormField>
                <AixiaFieldLabel label="Gross Amount" />
                <AixiaInputField
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.grossAmount}
                  disabled={Boolean(isSaving)}
                  onChange={(event) => updateField("grossAmount", event.target.value)}
                />
              </AixiaFormField>

              <AixiaFormField>
                <AixiaFieldLabel label="Bonus" />
                <AixiaInputField
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.bonusAmount}
                  disabled={Boolean(isSaving)}
                  onChange={(event) => updateField("bonusAmount", event.target.value)}
                />
              </AixiaFormField>

              <AixiaFormField>
                <AixiaFieldLabel label="Deduction" />
                <AixiaInputField
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.deductionAmount}
                  disabled={Boolean(isSaving)}
                  onChange={(event) => updateField("deductionAmount", event.target.value)}
                />
              </AixiaFormField>

              <AixiaFormField>
                <AixiaFieldLabel label="Reimbursement" />
                <AixiaInputField
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.reimbursementAmount}
                  disabled={Boolean(isSaving)}
                  onChange={(event) =>
                    updateField("reimbursementAmount", event.target.value)
                  }
                />
              </AixiaFormField>

              <AixiaValueBlock
                label="Calculated Net Amount"
                value={`${form.requestedCurrencyCode || "USD"} ${formatMoney(netAmount)}`}
                detail="Formula: gross + bonus + reimbursement − deduction."
              />
            </AixiaFormGrid>
          </AixiaSection>

          <AixiaSection
            title="Social Insurance"
            description="Select how social insurance contribution should appear on the filled payslip form."
            icon={ShieldCheck}
          >
            <AixiaFormGrid columns="two">
              <AixiaFormField>
                <AixiaFieldLabel label="Social Insurance Contribution" required />
                <AixiaSelectField
                  value={form.socialInsuranceContributionType}
                  disabled={Boolean(isSaving)}
                  onChange={(event) =>
                    updateField(
                      "socialInsuranceContributionType",
                      event.target.value as SocialInsuranceContributionType
                    )
                  }
                >
                  <option value="by_employee" className="bg-[#05070d]">
                    By Employee
                  </option>
                  <option value="by_employer" className="bg-[#05070d]">
                    By Employer
                  </option>
                </AixiaSelectField>
              </AixiaFormField>

              {form.socialInsuranceContributionType === "by_employer" ? (
                <AixiaFormField>
                  <AixiaFieldLabel label="Employer Contribution Details" required />
                  <AixiaInputField
                    value={form.socialInsuranceContributionDetails}
                    disabled={Boolean(isSaving)}
                    onChange={(event) =>
                      updateField(
                        "socialInsuranceContributionDetails",
                        event.target.value
                      )
                    }
                    placeholder="Enter employer social insurance details"
                  />
                </AixiaFormField>
              ) : (
                <AixiaValueBlock
                  label="PDF Form Output"
                  value="By Employee"
                  detail="The payslip form will mark social insurance contribution as employee-paid."
                />
              )}
            </AixiaFormGrid>
          </AixiaSection>

          <AixiaSection
            title="Signed Form"
            description="Generate the filled payslip form, save/sign it, then upload the employee-signed form or provide a signed-form link."
            icon={UploadCloud}
          >
            <AixiaReviewGrid variant="cards">
              <AixiaValueBlock
                label="Employee-signed form"
                value={
                  signedFormFile || uploadedPath || form.signedFormExternalUrl.trim()
                    ? "Ready"
                    : "Missing"
                }
                detail="Submission requires an uploaded signed form or external signed-form link. Drafts can be saved without a signed form."
              />
              <AixiaValueBlock
                label="Storage Bucket"
                value={BUCKET_NAME}
                detail={uploadedPath ? `Uploaded: ${uploadedPath}` : "No file uploaded yet."}
              />
            </AixiaReviewGrid>

            <div className="aixia-action-stack">
              <AixiaButton
                type="button"
                variant="primary"
                onClick={generateFilledPdfForm}
                disabled={!selectedEmployee || !selectedCompany || Boolean(isSaving)}
              >
                <Download className="h-4 w-4" />
                Generate Filled PDF Form
              </AixiaButton>
            </div>

            <AixiaFormGrid columns="two">
              <AixiaFormFullWidth>
                <AixiaDocumentUploadPanel
                  selectedFile={signedFormFile}
                  attachments={[]}
                  required={false}
                  disabled={Boolean(isSaving)}
                  uploading={Boolean(isSaving)}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  dropTitle="Drop employee-signed paycheck form here"
                  dropDescription="Upload the signed payslip/paycheck request form."
                  uploadLabel="Keep Selected File"
                  uploadingLabel="Saving..."
                  selectedFileLabel="Selected signed form"
                  emptyTitle="No signed form selected"
                  emptyDescription="Drafts can be saved without a signed form. Submission requires a file or external signed-form link."
                  requiredMessage="Signed form documentation is required before submission."
                  onFileSelect={(file) => setSignedFormFile(file)}
                  onRemoveSelectedFile={() => setSignedFormFile(null)}
                  onUpload={() => undefined}
                />
              </AixiaFormFullWidth>

              <AixiaFormField>
                <AixiaFieldLabel label="Signed Form Link" />
                <AixiaInputField
                  value={form.signedFormExternalUrl}
                  disabled={Boolean(isSaving)}
                  onChange={(event) =>
                    updateField("signedFormExternalUrl", event.target.value)
                  }
                  placeholder="Paste signed form link if stored externally"
                />
              </AixiaFormField>

              <AixiaFormField>
                <AixiaFieldLabel label="Notes" />
                <AixiaTextareaField
                  value={form.notes}
                  disabled={Boolean(isSaving)}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="Optional notes for Finance/Admin review"
                />
              </AixiaFormField>
            </AixiaFormGrid>

            <AixiaAlert tone="info">
              Generate the filled payslip form, save as PDF or print it, sign it as the
              employee, then upload the signed file. Submission requires an uploaded signed
              form or external signed-form link.
            </AixiaAlert>
          </AixiaSection>
        </div>

        <aside className="aixia-stack">
          <AixiaSection
            title="Request Summary"
            description="Save draft or submit the signed request to Finance/Admin review."
            icon={FileSignature}
          >
            <AixiaReviewGrid variant="cards">
              <AixiaValueBlock
                label="Company"
                value={buildCompanyLabel(selectedCompany)}
                detail={buildCompanySubLabel(selectedCompany)}
              />
              <AixiaValueBlock
                label="Employee"
                value={buildEmployeeLabel(selectedEmployee)}
                detail={buildEmployeeSubLabel(selectedEmployee)}
              />
              <AixiaValueBlock
                label="Payment Preference"
                value={getTransferMethodLabel(form.paymentTransferMethod)}
                detail={
                  form.paymentTransferMethod === "company_method"
                    ? "Finance/Admin will use the company default payroll method."
                    : form.paymentTransferInstructions.trim() ||
                      getTransferMethodHelper(form.paymentTransferMethod)
                }
              />
              <AixiaValueBlock
                label="Period"
                value={`${formatDate(form.periodStart)} → ${formatDate(form.periodEnd)}`}
                detail={`Requested pay date: ${formatDate(form.requestedPayDate)}`}
              />
              <AixiaValueBlock
                label="Net Paycheck Request"
                value={`${form.requestedCurrencyCode || "USD"} ${formatMoney(netAmount)}`}
                detail="Calculated from the amount fields."
              />
              <AixiaValueBlock
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
              <AixiaValueBlock
                label="Employee Signed Form"
                value={
                  signedFormFile || uploadedPath || form.signedFormExternalUrl.trim()
                    ? "Ready"
                    : "Missing"
                }
                detail="Required before submitting to Finance/Admin review."
              />
            </AixiaReviewGrid>

            <div className="aixia-action-stack">
              <AixiaButton
                type="button"
                variant="primary"
                onClick={() => void saveRequest("submit")}
                disabled={Boolean(isSaving) || isLoading}
              >
                {isSaving === "submit" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isSaving === "submit" ? "Submitting..." : "Submit To Finance Review"}
              </AixiaButton>

              <AixiaButton
                type="button"
                variant="secondary"
                onClick={() => void saveRequest("draft")}
                disabled={Boolean(isSaving) || isLoading}
              >
                {isSaving === "draft" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving === "draft" ? "Saving..." : "Save Draft"}
              </AixiaButton>
            </div>

            <AixiaAlert tone="info">
              Finance/Admin review, manager signature, funding allocation, payment
              distribution, and employee confirmation happen after this requester page.
            </AixiaAlert>
          </AixiaSection>
        </aside>
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
    </FinancePage>
  );
}
