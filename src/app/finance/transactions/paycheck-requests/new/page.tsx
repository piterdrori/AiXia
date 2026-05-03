import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Download,
  FileSignature,
  LinkIcon,
  Save,
  Send,
  UploadCloud,
  UserRound,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

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

type FormState = {
  employeeRefId: string;
  payProfileId: string;
  periodStart: string;
  periodEnd: string;
  requestedPayDate: string;
  requestedCurrencyCode: string;
  grossAmount: string;
  bonusAmount: string;
  deductionAmount: string;
  reimbursementAmount: string;
  signedFormExternalUrl: string;
  notes: string;
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

function buildEmployeeLabel(row: EmployeeRefRow | null | undefined) {
  if (!row) return "Select employee";

  const profileName =
    row.profile?.full_name?.trim() || row.profile?.display_name?.trim();

  if (profileName) return profileName;
  return `Employee ${row.code}`;
}

function buildEmployeeSubLabel(row: EmployeeRefRow | null | undefined) {
  if (!row) return "Employee registry required";

  return [`Code ${row.code}`, row.mark ? formatLabel(row.mark) : null]
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

function sanitizePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80);
}

function inputClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function textareaClass() {
  return "min-h-[132px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
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
  icon: typeof FileSignature;
  children: React.ReactNode;
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className={labelClass()}>{label}</span>
      <select
        value={value}
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    employeeRefId: "",
    payProfileId: "",
    periodStart: defaultPeriodStart(),
    periodEnd: defaultPeriodEnd(),
    requestedPayDate: todayDate(),
    requestedCurrencyCode: "USD",
    grossAmount: "0",
    bonusAmount: "0",
    deductionAmount: "0",
    reimbursementAmount: "0",
    signedFormExternalUrl: "",
    notes: "",
  });

  const [signedFormFile, setSignedFormFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [uploadedBucket, setUploadedBucket] = useState<string | null>(null);
  const [uploadedAt, setUploadedAt] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const selectedEmployee = useMemo(() => {
    return employeeRefs.find((row) => row.id === form.employeeRefId) || null;
  }, [employeeRefs, form.employeeRefId]);

  const selectedPayProfile = useMemo(() => {
    return payProfiles.find((row) => row.id === form.payProfileId) || null;
  }, [form.payProfileId, payProfiles]);

  const filteredPayProfiles = useMemo(() => {
    if (!selectedEmployee) return [];
    return payProfiles.filter((row) => row.user_id === selectedEmployee.user_id);
  }, [payProfiles, selectedEmployee]);

  const grossAmount = toNumber(form.grossAmount);
  const bonusAmount = toNumber(form.bonusAmount);
  const deductionAmount = toNumber(form.deductionAmount);
  const reimbursementAmount = toNumber(form.reimbursementAmount);
  const netAmount = Math.max(
    grossAmount + bonusAmount + reimbursementAmount - deductionAmount,
    0
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
    },
    []
  );

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("You must be signed in to create a paycheck request.");
      }

      setCurrentUserId(user.id);

      const [employeeRefsResult, payProfilesResult, currenciesResult] =
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
                "profile:profiles!finance_employee_refs_user_id_fkey(user_id, full_name, display_name)",
              ].join(", ")
            )
            .eq("status", "active")
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
        ]);

      if (employeeRefsResult.error) throw employeeRefsResult.error;
      if (payProfilesResult.error) throw payProfilesResult.error;
      if (currenciesResult.error) throw currenciesResult.error;

      const loadedEmployeeRefs = (employeeRefsResult.data || []) as unknown as EmployeeRefRow[];
      const loadedPayProfiles = (payProfilesResult.data || []) as unknown as PayProfileRow[];
      const loadedCurrencies = (currenciesResult.data || []) as CurrencyRow[];

      setEmployeeRefs(loadedEmployeeRefs);
      setPayProfiles(loadedPayProfiles);
      setCurrencies(loadedCurrencies);

      const ownEmployee =
        loadedEmployeeRefs.find((row) => row.user_id === user.id) ||
        loadedEmployeeRefs[0] ||
        null;

      const ownPayProfile = ownEmployee
        ? loadedPayProfiles.find((row) => row.user_id === ownEmployee.user_id) || null
        : null;

      setForm((current) => ({
        ...current,
        employeeRefId: ownEmployee?.id || current.employeeRefId,
        payProfileId: ownPayProfile?.id || current.payProfileId,
        requestedCurrencyCode:
          ownPayProfile?.currency_code ||
          loadedCurrencies.find((row) => row.is_base_currency)?.currency_code ||
          loadedCurrencies[0]?.currency_code ||
          current.requestedCurrencyCode,
        grossAmount:
          ownPayProfile?.pay_type === "hourly"
            ? String(
                toNumber(ownPayProfile.hourly_rate) *
                  Math.max(toNumber(ownPayProfile.default_hours), 0)
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
      if (current.payProfileId && filteredPayProfiles.some((row) => row.id === current.payProfileId)) {
        return current;
      }

      return {
        ...current,
        payProfileId: firstProfile.id,
        requestedCurrencyCode: firstProfile.currency_code || current.requestedCurrencyCode,
        grossAmount:
          firstProfile.pay_type === "hourly"
            ? String(
                toNumber(firstProfile.hourly_rate) *
                  Math.max(toNumber(firstProfile.default_hours), 0)
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
              toNumber(selectedPayProfile.hourly_rate) *
                Math.max(toNumber(selectedPayProfile.default_hours), 0)
            )
          : String(toNumber(selectedPayProfile.base_salary)),
    }));
  }, [selectedPayProfile]);

  const validateForm = useCallback(
    (submitMode: "draft" | "submit") => {
      if (!currentUserId) return "You must be signed in.";

      if (!form.employeeRefId) {
        return "Select an employee reference.";
      }

      if (!selectedEmployee) {
        return "Selected employee reference is invalid.";
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

      if (!form.requestedCurrencyCode.trim()) {
        return "Currency is required.";
      }

      if (grossAmount <= 0 && bonusAmount <= 0 && reimbursementAmount <= 0) {
        return "At least one positive amount is required.";
      }

      if (netAmount <= 0) {
        return "Net amount must be greater than 0.";
      }

      if (submitMode === "submit" && !signedFormFile && !uploadedPath && !form.signedFormExternalUrl.trim()) {
        return "Signed form upload or signed form link is required before submission.";
      }

      return null;
    },
    [
      bonusAmount,
      currentUserId,
      form.employeeRefId,
      form.periodEnd,
      form.periodStart,
      form.requestedCurrencyCode,
      form.signedFormExternalUrl,
      grossAmount,
      netAmount,
      reimbursementAmount,
      selectedEmployee,
      signedFormFile,
      uploadedPath,
    ]
  );

  const uploadSignedFormIfNeeded = useCallback(
    async (requestId: string) => {
      if (!signedFormFile || uploadedPath) {
        return {
          bucket: uploadedBucket,
          path: uploadedPath,
          uploadedAt,
        };
      }

      if (!selectedEmployee) {
        throw new Error("Employee reference is required before uploading form.");
      }

      const extension = signedFormFile.name.split(".").pop() || "file";
      const safeCode = sanitizePathPart(selectedEmployee.code || "employee");
      const safeName = sanitizePathPart(signedFormFile.name.replace(/\.[^.]+$/, ""));
      const path = `${safeCode}/${requestId}/${Date.now()}-${safeName}.${extension}`;

      const uploadResult = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, signedFormFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadResult.error) throw uploadResult.error;

      const now = new Date().toISOString();

      setUploadedBucket(BUCKET_NAME);
      setUploadedPath(path);
      setUploadedAt(now);

      return {
        bucket: BUCKET_NAME,
        path,
        uploadedAt: now,
      };
    },
    [selectedEmployee, signedFormFile, uploadedAt, uploadedBucket, uploadedPath]
  );

  const downloadFormTemplate = useCallback(() => {
    const employeeName = buildEmployeeLabel(selectedEmployee);
    const employeeCode = selectedEmployee?.code || "—";
    const payProfileLabel = buildPayProfileLabel(selectedPayProfile);
    const currency = form.requestedCurrencyCode || "USD";

    const lines = [
      "AIXIA PAYCHECK REQUEST FORM",
      "",
      `Employee: ${employeeName}`,
      `Employee Code: ${employeeCode}`,
      `Pay Profile: ${payProfileLabel}`,
      `Payroll Period: ${formatDate(form.periodStart)} to ${formatDate(form.periodEnd)}`,
      `Requested Pay Date: ${formatDate(form.requestedPayDate)}`,
      "",
      "PAYCHECK AMOUNTS",
      `Gross Amount: ${currency} ${formatMoney(grossAmount)}`,
      `Bonus Amount: ${currency} ${formatMoney(bonusAmount)}`,
      `Deduction Amount: ${currency} ${formatMoney(deductionAmount)}`,
      `Reimbursement Amount: ${currency} ${formatMoney(reimbursementAmount)}`,
      `Net Amount: ${currency} ${formatMoney(netAmount)}`,
      "",
      "EMPLOYEE DECLARATION",
      "I confirm that the information above is correct and request payroll processing for this period.",
      "",
      "Employee Signature: ______________________________",
      "Date: ______________________________",
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `paycheck-request-${selectedEmployee?.code || "employee"}-${form.periodStart}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [
    bonusAmount,
    deductionAmount,
    form.periodEnd,
    form.periodStart,
    form.requestedCurrencyCode,
    form.requestedPayDate,
    grossAmount,
    netAmount,
    reimbursementAmount,
    selectedEmployee,
    selectedPayProfile,
  ]);

  const saveRequest = useCallback(
    async (submitMode: "draft" | "submit") => {
      setIsSaving(true);
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

        const insertResult = await supabase
          .from("finance_paycheck_requests")
          .insert({
            employee_ref_id: selectedEmployee.id,
            employee_user_id: selectedEmployee.user_id,
            pay_profile_id: form.payProfileId || null,
            period_start: form.periodStart,
            period_end: form.periodEnd,
            requested_pay_date: form.requestedPayDate || null,
            requested_currency_code: form.requestedCurrencyCode.trim().toUpperCase(),
            requested_gross_amount: grossAmount,
            requested_bonus_amount: bonusAmount,
            requested_deduction_amount: deductionAmount,
            requested_reimbursement_amount: reimbursementAmount,
            requested_net_amount: netAmount,
            status: "draft",
            review_status: "not_submitted",
            documentation_status: "missing",
            signed_form_status: "not_uploaded",
            recipient_confirmation_status: "not_paid_yet",
            notes: form.notes.trim() || null,
            metadata: {
              employee_snapshot: {
                employee_ref_id: selectedEmployee.id,
                employee_user_id: selectedEmployee.user_id,
                employee_code: selectedEmployee.code,
                employee_mark: selectedEmployee.mark,
                employee_label: buildEmployeeLabel(selectedEmployee),
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
              requested_amounts: {
                gross: grossAmount,
                bonus: bonusAmount,
                deduction: deductionAmount,
                reimbursement: reimbursementAmount,
                net: netAmount,
                currency_code: form.requestedCurrencyCode.trim().toUpperCase(),
              },
              form_template: {
                downloaded_available: true,
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
            updated_by: currentUserId,
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
          error instanceof Error
            ? error.message
            : "Failed to save paycheck request."
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      bonusAmount,
      currentUserId,
      deductionAmount,
      form.notes,
      form.payProfileId,
      form.periodEnd,
      form.periodStart,
      form.requestedCurrencyCode,
      form.requestedPayDate,
      form.signedFormExternalUrl,
      grossAmount,
      navigate,
      netAmount,
      reimbursementAmount,
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
                  Create an employee paycheck request, pull pay profile defaults,
                  download the form, upload the signed form, and submit to Finance review.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Employee Registry
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    Pay Profile Defaults
                  </div>
                  <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                    Signed Form Required
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

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="grid gap-6">
            <SectionCard
              title="Employee & Pay Profile"
              description="Select the employee reference and pay profile used for this paycheck request."
              icon={UserRound}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <SelectShell
                  label="Employee Reference"
                  value={form.employeeRefId}
                  onChange={(value) => {
                    updateField("employeeRefId", value);
                    updateField("payProfileId", "");
                  }}
                >
                  <option value="">Select employee</option>
                  {employeeRefs.map((row) => (
                    <option key={row.id} value={row.id}>
                      {buildEmployeeLabel(row)} — {buildEmployeeSubLabel(row)}
                    </option>
                  ))}
                </SelectShell>

                <SelectShell
                  label="Pay Profile"
                  value={form.payProfileId}
                  onChange={(value) => updateField("payProfileId", value)}
                >
                  <option value="">Select pay profile</option>
                  {filteredPayProfiles.map((row) => (
                    <option key={row.id} value={row.id}>
                      {buildPayProfileLabel(row)}
                    </option>
                  ))}
                </SelectShell>
              </div>

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
                  detail="Can be changed if request currency differs."
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
                    onChange={(event) => updateField("periodStart", event.target.value)}
                    className={inputClass()}
                  />
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Period End</span>
                  <input
                    type="date"
                    value={form.periodEnd}
                    onChange={(event) => updateField("periodEnd", event.target.value)}
                    className={inputClass()}
                  />
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Requested Pay Date</span>
                  <input
                    type="date"
                    value={form.requestedPayDate}
                    onChange={(event) =>
                      updateField("requestedPayDate", event.target.value)
                    }
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
                    onChange={(event) =>
                      updateField("deductionAmount", event.target.value)
                    }
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
              title="Signed Form"
              description="Download the request form, sign it, then upload the signed form or provide a signed-form link."
              icon={UploadCloud}
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="grid gap-4">
                  <button
                    type="button"
                    onClick={downloadFormTemplate}
                    disabled={!selectedEmployee}
                    className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Download Form Template
                  </button>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Upload Signed Form</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                      onChange={(event) =>
                        setSignedFormFile(event.target.files?.[0] || null)
                      }
                      className="block w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-100 hover:file:bg-cyan-500/15"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Signed Form Link</span>
                    <div className="relative">
                      <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={form.signedFormExternalUrl}
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
                      onChange={(event) => updateField("notes", event.target.value)}
                      placeholder="Optional notes for Finance review"
                      className={textareaClass()}
                    />
                  </label>
                </div>

                <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4">
                  <div className="text-sm font-semibold text-amber-100">
                    Signed form required for submission
                  </div>
                  <p className="mt-2 text-xs leading-5 text-amber-100/75">
                    Drafts can be saved without a signed form. Submitting to Finance review
                    requires either an uploaded signed form or an external signed-form link.
                  </p>
                  <div className="mt-4 text-xs leading-5 text-amber-100/75">
                    Bucket: {BUCKET_NAME}
                  </div>
                  {signedFormFile ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                      Selected: {signedFormFile.name}
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
                  Save draft or submit the signed request to Finance review.
                </p>
              </div>

              <div className="grid gap-4 p-5">
                <SummaryBlock
                  label="Employee"
                  value={buildEmployeeLabel(selectedEmployee)}
                  detail={buildEmployeeSubLabel(selectedEmployee)}
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
                  label="Signed Form"
                  value={
                    signedFormFile || uploadedPath || form.signedFormExternalUrl.trim()
                      ? "Ready"
                      : "Missing"
                  }
                  detail="Required before submitting to Finance."
                />

                <div className="grid gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => void saveRequest("submit")}
                    disabled={isSaving || isLoading}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Submit To Finance Review
                  </button>

                  <button
                    type="button"
                    onClick={() => void saveRequest("draft")}
                    disabled={isSaving || isLoading}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    Save Draft
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
