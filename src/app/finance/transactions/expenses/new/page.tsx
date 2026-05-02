import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Link2,
  Loader2,
  Receipt,
  Save,
  ShoppingCart,
  Sparkles,
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

const CURRENCY_CODES = ["USD", "EUR", "ILS", "CNY", "HKD", "GBP"];

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
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
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
  children: React.ReactNode;
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

export default function FinanceNewExpensePage() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [documentationFile, setDocumentationFile] = useState<File | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const isOnlineShopping = form.expenseType === "online_shopping";
  const isOtherExpenseType = form.expenseType === "other";
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

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true);

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

      setCompanies((companiesResult.data || []) as CompanyRow[]);
      setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
      setProfiles((profilesResult.data || []) as ProfileRow[]);
    } catch (error) {
      console.error("Failed to load expense request options:", error);
      setFormError("Failed to load companies or employees.");
      setCompanies([]);
      setEmployees([]);
      setProfiles([]);
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

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

      if (submitMode === "request" && documentationStatus === "missing" && form.isRetroactive) {
        return "Retroactive requests need documentation upload or documentation link.";
      }

      return null;
    },
    [amountValue, documentationStatus, form, isOnlineShopping, isOtherExpenseType]
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
      navigate,
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
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

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
                  Request Permission Before Spending
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Create an internal expense request. The requester does not choose funding
                  company, bank account, or payment allocation here. Finance handles approval,
                  funding, reimbursement, and Payment Made from the Payments Made tab.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SummaryBlock
                  title="Requested Amount"
                  value={`${form.currencyCode} ${amountValue > 0 ? amountValue.toLocaleString() : "0.00"}`}
                  subtitle="This is the estimated or actual expense amount."
                />
                <SummaryBlock
                  title="Documentation"
                  value={
                    documentationStatus === "missing"
                      ? "Missing"
                      : documentationStatus === "files_and_links"
                        ? "Files + Link"
                        : documentationStatus === "uploaded"
                          ? "Uploaded"
                          : "Linked"
                  }
                  subtitle="Documentation is required before Finance verification."
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
                      disabled={isLoadingOptions}
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
                    disabled={isLoadingOptions}
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
                    placeholder="Where this expense comes from, for example Amazon order, legal service, office support"
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
                    placeholder="0.00"
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

                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
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

          <aside className="sticky top-6 grid gap-6">
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
                  disabled={isSaving || isLoadingOptions}
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
                  disabled={isSaving || isLoadingOptions}
                  onClick={() => void saveExpense("draft")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Draft
                </button>
              </div>

              <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4 text-xs leading-5 text-slate-500">
                Funding company, bank account, Payment Made creation, and allocation are handled
                later by Finance/Admin in Payments Made.
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
