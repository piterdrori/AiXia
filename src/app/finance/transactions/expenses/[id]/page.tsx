import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Link2,
  Loader2,
  Pencil,
  Receipt,
  RefreshCcw,
  Save,
  ShieldCheck,
  ShoppingCart,
  UploadCloud,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type ExpenseRow = {
  id: string;
  expense_number: string | null;
  title: string;
  description: string | null;
  amount: number | string | null;
  requested_amount: number | string | null;
  approved_amount: number | string | null;
  final_amount: number | string | null;
  currency_code: string | null;
  expense_date: string;
  expense_type: string;
  category_id: string | null;
  status: string;
  approval_status: string | null;
  payment_status: string | null;
  request_status: string | null;
  documentation_status: string | null;
  finance_review_status: string | null;
  funding_status: string | null;
  coverage_status: string | null;
  recipient_confirmation_status: string | null;
  company_id: string | null;
  employee_ref_id: string | null;
  expense_made_by_type: string | null;
  responsible_person_name: string | null;
  other_made_by_explanation: string | null;
  expense_source_name: string | null;
  other_expense_explanation: string | null;
  is_retroactive: boolean | null;
  retroactive_reason: string | null;
  approved_to_spend_at: string | null;
  rejected_before_spend_at: string | null;
  rejection_reason: string | null;
  documentation_submitted_at: string | null;
  verified_for_payment_at: string | null;
  verification_notes: string | null;
  online_platform: string | null;
  online_order_number: string | null;
  online_order_date: string | null;
  online_order_url: string | null;
  online_tracking_number: string | null;
  online_confirmation_status: string | null;
  online_confirmation_notes: string | null;
  recipient_confirmed_at: string | null;
  recipient_confirmation_notes: string | null;
  recipient_dispute_reason: string | null;
  notes: string | null;
  metadata: {
    documentation_link?: string | null;
    online_shopping?: {
      platform?: string | null;
      order_number?: string | null;
      order_date?: string | null;
      order_url?: string | null;
      tracking_number?: string | null;
    } | null;
    [key: string]: unknown;
  } | null;
  submitter_user_id: string | null;
  created_at: string;
  updated_at: string;
};

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

type AllocationRow = {
  id: string;
  payment_made_id: string;
  expense_id: string;
  funding_batch_id: string | null;
  funding_company_id: string | null;
  paid_from_bank_account_id: string | null;
  recipient_employee_ref_id: string | null;
  recipient_person_name: string | null;
  allocated_amount: number | string | null;
  currency_code: string | null;
  payment_currency_code: string | null;
  converted_amount: number | string | null;
  recipient_confirmation_status: string | null;
  recipient_confirmation_notes: string | null;
  recipient_dispute_reason: string | null;
  created_at: string;
};

type PaymentMadeRow = {
  id: string;
  amount: number | string | null;
  payment_date: string;
  status: string;
  reference_number: string | null;
  payment_source_type: string | null;
  recipient_confirmation_status: string | null;
  paid_from_company_id: string | null;
  paid_from_bank_account_id: string | null;
  created_at: string;
};

type FundingBatchRow = {
  id: string;
  batch_number: string;
  funding_company_id: string;
  funding_bank_account_id: string | null;
  allocation_date: string;
  currency_code: string | null;
  allocated_amount: number | string | null;
  status: string;
  documentation_status: string | null;
};

type BankAccountRow = {
  id: string;
  name: string | null;
  bank_name: string | null;
  institution_name: string | null;
  masked_account_number: string | null;
  currency_code: string | null;
  company_id: string | null;
};

type AttachmentRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  file_upload_id: string;
  uploaded_by: string | null;
  notes: string | null;
  metadata: {
    bucket?: string | null;
    uploaded_from?: string | null;
    resolved_mime_type?: string | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
};

type FileUploadRow = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  entity_type: string;
  created_at: string;
};

type AttachmentWithFile = AttachmentRow & {
  fileUpload: FileUploadRow | null;
};

type TimelineItem = {
  label: string;
  value: string;
  detail: string;
  tone: "cyan" | "emerald" | "amber" | "rose" | "slate" | "violet";
};

type ExpenseMadeByType = "employee" | "owner_management" | "company_direct" | "other";

type ExpenseEditFormState = {
  title: string;
  description: string;
  companyId: string;
  expenseMadeByType: ExpenseMadeByType;
  employeeRefId: string;
  responsiblePersonName: string;
  otherMadeByExplanation: string;
  expenseType: string;
  expenseSourceName: string;
  otherExpenseExplanation: string;
  amount: string;
  currencyCode: string;
  expenseDate: string;
  isRetroactive: boolean;
  retroactiveReason: string;
  onlinePlatform: string;
  onlineOrderNumber: string;
  onlineOrderDate: string;
  onlineOrderUrl: string;
  onlineTrackingNumber: string;
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

const EDITABLE_REQUEST_STATUSES = new Set([
  "draft",
  "requested",
  "approved_to_spend",
  "expense_made",
  "documentation_submitted",
  "documentation_issue",
]);

const statusToneMap: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  draft: "slate",
  submitted: "cyan",
  approved: "emerald",
  rejected: "rose",
  reimbursed: "emerald",
  requested: "cyan",
  approved_to_spend: "emerald",
  rejected_before_spend: "rose",
  expense_made: "amber",
  documentation_submitted: "cyan",
  documentation_issue: "rose",
  verified_for_payment: "emerald",
  missing: "rose",
  uploaded: "cyan",
  linked: "cyan",
  files_and_links: "cyan",
  verified: "emerald",
  issue_found: "rose",
  pending_review: "amber",
  approved_for_payment: "emerald",
  needs_correction: "amber",
  not_allocated: "slate",
  partially_allocated: "amber",
  allocated: "emerald",
  allocation_cancelled: "rose",
  not_covered: "slate",
  partially_covered: "amber",
  covered: "emerald",
  not_paid_yet: "slate",
  pending_confirmation: "amber",
  received_confirmed: "emerald",
  not_received: "rose",
  disputed: "rose",
  admin_closed: "violet",
  not_applicable: "slate",
  not_confirmed: "amber",
  confirmed: "emerald",
  cancelled_refunded: "rose",
};

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function getStatusToneClasses(value: string | null | undefined) {
  const tone = statusToneMap[value ?? ""] ?? "slate";

  switch (tone) {
    case "emerald":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "amber":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "rose":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "violet":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "cyan":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "slate":
    default:
      return "border-white/10 bg-white/[0.06] text-slate-300";
  }
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getStatusToneClasses(
        value
      )}`}
    >
      <span className="truncate">{formatLabel(value)}</span>
    </span>
  );
}

function inputClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function textareaClass() {
  return "min-h-[112px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function ValueBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold leading-6 text-white">{value}</div>
      {detail ? <div className="mt-2 text-xs leading-5 text-slate-500">{detail}</div> : null}
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

function getEmployeeLabel(employee: EmployeeRefRow | null) {
  if (!employee) return "—";

  const role = employee.metadata?.job_title || employee.metadata?.source_role || employee.mark;
  const company = employee.metadata?.company;

  return [employee.code || "Employee", role, company].filter(Boolean).join(" • ");
}

function getBankLabel(bank: BankAccountRow | null) {
  if (!bank) return "—";

  return [
    bank.name || bank.bank_name || bank.institution_name || "Bank account",
    bank.currency_code,
    bank.masked_account_number,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getExpenseMadeByLabel(
  expense: ExpenseRow,
  employee: EmployeeRefRow | null
) {
  if (expense.expense_made_by_type === "employee") return getEmployeeLabel(employee);
  if (expense.expense_made_by_type === "owner_management") {
    return expense.responsible_person_name || "Owner / Management";
  }
  if (expense.expense_made_by_type === "company_direct") return "Company Direct";
  if (expense.expense_made_by_type === "other") {
    return expense.other_made_by_explanation || "Other";
  }
  return "—";
}

export default function FinanceExpenseDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const expenseId = params.id;

  const [expense, setExpense] = useState<ExpenseRow | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [employee, setEmployee] = useState<EmployeeRefRow | null>(null);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [payments, setPayments] = useState<PaymentMadeRow[]>([]);
  const [fundingBatches, setFundingBatches] = useState<FundingBatchRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentWithFile[]>([]);
  const [documentationFile, setDocumentationFile] = useState<File | null>(null);
  const [documentationLink, setDocumentationLink] = useState("");
  const [confirmationNotes, setConfirmationNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingDocumentation, setIsUploadingDocumentation] = useState(false);
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [isSavingOverview, setIsSavingOverview] = useState(false);
  const [editForm, setEditForm] = useState<ExpenseEditFormState | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const companyMap = useMemo(() => {
    return new Map(companies.map((item) => [item.id, item]));
  }, [companies]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((item) => [item.id, item]));
  }, [bankAccounts]);

  const paymentMap = useMemo(() => {
    return new Map(payments.map((item) => [item.id, item]));
  }, [payments]);

  const fundingBatchMap = useMemo(() => {
    return new Map(fundingBatches.map((item) => [item.id, item]));
  }, [fundingBatches]);

  const documentationExternalLink = useMemo(() => {
    if (documentationLink.trim()) return documentationLink.trim();
    return expense?.metadata?.documentation_link || expense?.online_order_url || "";
  }, [documentationLink, expense]);

  const expenseAmount = useMemo(() => {
    return toNumber(expense?.final_amount || expense?.requested_amount || expense?.amount);
  }, [expense]);

  const coveredAmount = useMemo(() => {
    return allocations.reduce(
      (sum, item) => sum + toNumber(item.converted_amount || item.allocated_amount),
      0
    );
  }, [allocations]);

  const remainingAmount = Math.max(expenseAmount - coveredAmount, 0);

  const expenseMadeByLabel = useMemo(() => {
    if (!expense) return "—";
    return getExpenseMadeByLabel(expense, employee);
  }, [employee, expense]);

  const canEditOverview = useMemo(() => {
    if (!expense) return false;

    const requestStatus = expense.request_status || expense.status || "draft";

    return EDITABLE_REQUEST_STATUSES.has(requestStatus);
  }, [expense]);

  const updateEditField = useCallback(
    <Key extends keyof ExpenseEditFormState>(key: Key, value: ExpenseEditFormState[Key]) => {
      setEditForm((current) => {
        if (!current) return current;

        return {
          ...current,
          [key]: value,
        };
      });

      setPageError(null);
      setPageMessage(null);
    },
    []
  );

  const startEditingOverview = useCallback(() => {
    if (!expense) return;

    setEditForm({
      title: expense.title || "",
      description: expense.description || "",
      companyId: expense.company_id || "",
      expenseMadeByType: (expense.expense_made_by_type || "employee") as ExpenseMadeByType,
      employeeRefId: expense.employee_ref_id || "",
      responsiblePersonName: expense.responsible_person_name || "",
      otherMadeByExplanation: expense.other_made_by_explanation || "",
      expenseType: expense.expense_type || "office_support",
      expenseSourceName: expense.expense_source_name || "",
      otherExpenseExplanation: expense.other_expense_explanation || "",
      amount: String(expense.final_amount || expense.requested_amount || expense.amount || ""),
      currencyCode: expense.currency_code || "USD",
      expenseDate: expense.expense_date || "",
      isRetroactive: Boolean(expense.is_retroactive),
      retroactiveReason: expense.retroactive_reason || "",
      onlinePlatform: expense.online_platform || "",
      onlineOrderNumber: expense.online_order_number || "",
      onlineOrderDate: expense.online_order_date || "",
      onlineOrderUrl: expense.online_order_url || "",
      onlineTrackingNumber: expense.online_tracking_number || "",
      notes: expense.notes || "",
    });

    setIsEditingOverview(true);
    setPageError(null);
    setPageMessage(null);
  }, [expense]);

  const cancelEditingOverview = useCallback(() => {
    setIsEditingOverview(false);
    setEditForm(null);
    setPageError(null);
  }, []);

  const saveOverviewEdits = useCallback(async () => {
    if (!expense || !editForm) return;

    setIsSavingOverview(true);
    setPageError(null);
    setPageMessage(null);

    try {
      const amountValue = Number(editForm.amount);

      if (!editForm.title.trim()) {
        throw new Error("Expense title is required.");
      }

      if (!editForm.companyId) {
        throw new Error("Expense company is required.");
      }

      if (!editForm.expenseSourceName.trim()) {
        throw new Error("Expense source is required.");
      }

      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        throw new Error("Expense amount must be greater than zero.");
      }

      if (editForm.expenseMadeByType === "employee" && !editForm.employeeRefId) {
        throw new Error("Employee is required when Expense Made By is Employee.");
      }

      if (
        editForm.expenseMadeByType === "owner_management" &&
        !editForm.responsiblePersonName.trim()
      ) {
        throw new Error("Responsible person name is required for Owner / Management expenses.");
      }

      if (
        editForm.expenseMadeByType === "other" &&
        !editForm.otherMadeByExplanation.trim()
      ) {
        throw new Error("Other explanation is required when Expense Made By is Other.");
      }

      if (editForm.expenseType === "other" && !editForm.otherExpenseExplanation.trim()) {
        throw new Error("Other expense explanation is required.");
      }

      if (editForm.isRetroactive && !editForm.retroactiveReason.trim()) {
        throw new Error("Retroactive reason is required.");
      }

      if (editForm.expenseType === "online_shopping" && !editForm.onlinePlatform.trim()) {
        throw new Error("Online platform is required for online shopping expenses.");
      }

      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const userId = authResult.data.user?.id ?? null;

      const metadata = {
        ...(expense.metadata || {}),
        online_shopping:
          editForm.expenseType === "online_shopping"
            ? {
                platform: editForm.onlinePlatform.trim(),
                order_number: editForm.onlineOrderNumber.trim(),
                order_date: editForm.onlineOrderDate || null,
                order_url: editForm.onlineOrderUrl.trim(),
                tracking_number: editForm.onlineTrackingNumber.trim(),
              }
            : null,
      };

      const updateResult = await supabase
        .from("finance_expenses")
        .update({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          company_id: editForm.companyId,
          expense_made_by_type: editForm.expenseMadeByType,
          employee_ref_id:
            editForm.expenseMadeByType === "employee" ? editForm.employeeRefId : null,
          responsible_person_name:
            editForm.expenseMadeByType === "owner_management"
              ? editForm.responsiblePersonName.trim()
              : null,
          other_made_by_explanation:
            editForm.expenseMadeByType === "other"
              ? editForm.otherMadeByExplanation.trim()
              : null,
          expense_type: editForm.expenseType,
          expense_source_name: editForm.expenseSourceName.trim(),
          other_expense_explanation:
            editForm.expenseType === "other"
              ? editForm.otherExpenseExplanation.trim()
              : null,
          amount: amountValue,
          requested_amount: amountValue,
          final_amount: amountValue,
          currency_code: editForm.currencyCode.trim().toUpperCase(),
          expense_date: editForm.expenseDate,
          is_retroactive: editForm.isRetroactive,
          retroactive_reason: editForm.isRetroactive
            ? editForm.retroactiveReason.trim()
            : null,
          online_platform:
            editForm.expenseType === "online_shopping"
              ? editForm.onlinePlatform.trim()
              : null,
          online_order_number:
            editForm.expenseType === "online_shopping"
              ? editForm.onlineOrderNumber.trim() || null
              : null,
          online_order_date:
            editForm.expenseType === "online_shopping" && editForm.onlineOrderDate
              ? editForm.onlineOrderDate
              : null,
          online_order_url:
            editForm.expenseType === "online_shopping"
              ? editForm.onlineOrderUrl.trim() || null
              : null,
          online_tracking_number:
            editForm.expenseType === "online_shopping"
              ? editForm.onlineTrackingNumber.trim() || null
              : null,
          online_confirmation_status:
            editForm.expenseType === "online_shopping"
              ? expense.online_confirmation_status === "not_applicable"
                ? "not_confirmed"
                : expense.online_confirmation_status || "not_confirmed"
              : "not_applicable",
          notes: editForm.notes.trim() || null,
          metadata,
          updated_by: userId,
        })
        .eq("id", expense.id);

      if (updateResult.error) throw updateResult.error;

      setExpense((current) => {
        if (!current) return current;

        return {
          ...current,
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          company_id: editForm.companyId,
          expense_made_by_type: editForm.expenseMadeByType,
          employee_ref_id:
            editForm.expenseMadeByType === "employee" ? editForm.employeeRefId : null,
          responsible_person_name:
            editForm.expenseMadeByType === "owner_management"
              ? editForm.responsiblePersonName.trim()
              : null,
          other_made_by_explanation:
            editForm.expenseMadeByType === "other"
              ? editForm.otherMadeByExplanation.trim()
              : null,
          expense_type: editForm.expenseType,
          expense_source_name: editForm.expenseSourceName.trim(),
          other_expense_explanation:
            editForm.expenseType === "other"
              ? editForm.otherExpenseExplanation.trim()
              : null,
          amount: amountValue,
          requested_amount: amountValue,
          final_amount: amountValue,
          currency_code: editForm.currencyCode.trim().toUpperCase(),
          expense_date: editForm.expenseDate,
          is_retroactive: editForm.isRetroactive,
          retroactive_reason: editForm.isRetroactive
            ? editForm.retroactiveReason.trim()
            : null,
          online_platform:
            editForm.expenseType === "online_shopping"
              ? editForm.onlinePlatform.trim()
              : null,
          online_order_number:
            editForm.expenseType === "online_shopping"
              ? editForm.onlineOrderNumber.trim() || null
              : null,
          online_order_date:
            editForm.expenseType === "online_shopping" && editForm.onlineOrderDate
              ? editForm.onlineOrderDate
              : null,
          online_order_url:
            editForm.expenseType === "online_shopping"
              ? editForm.onlineOrderUrl.trim() || null
              : null,
          online_tracking_number:
            editForm.expenseType === "online_shopping"
              ? editForm.onlineTrackingNumber.trim() || null
              : null,
          online_confirmation_status:
            editForm.expenseType === "online_shopping"
              ? current.online_confirmation_status === "not_applicable"
                ? "not_confirmed"
                : current.online_confirmation_status || "not_confirmed"
              : "not_applicable",
          notes: editForm.notes.trim() || null,
          metadata,
          updated_at: new Date().toISOString(),
        };
      });

      setCompany(companies.find((item) => item.id === editForm.companyId) || null);
      setEmployee(
        editForm.expenseMadeByType === "employee"
          ? employees.find((item) => item.id === editForm.employeeRefId) || null
          : null
      );
      setIsEditingOverview(false);
      setEditForm(null);
      setPageMessage("Expense overview updated.");
    } catch (error) {
      console.error("Failed to update expense overview:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to update expense overview."
      );
    } finally {
      setIsSavingOverview(false);
    }
  }, [companies, editForm, employees, expense]);

  const timelineItems = useMemo<TimelineItem[]>(() => {
    if (!expense) return [];

    return [
      {
        label: "Request",
        value: formatLabel(expense.request_status || expense.status),
        detail: `Created ${formatDateTime(expense.created_at)}`,
        tone:
          statusToneMap[expense.request_status || expense.status || ""] === "rose"
            ? "rose"
            : "cyan",
      },
      {
        label: "Documentation",
        value: formatLabel(expense.documentation_status),
        detail: expense.documentation_submitted_at
          ? `Submitted ${formatDateTime(expense.documentation_submitted_at)}`
          : "Documentation is required before Finance verification.",
        tone: statusToneMap[expense.documentation_status || ""] ?? "slate",
      },
      {
        label: "Finance Review",
        value: formatLabel(expense.finance_review_status),
        detail: expense.verified_for_payment_at
          ? `Verified ${formatDateTime(expense.verified_for_payment_at)}`
          : expense.verification_notes || "Finance review happens inside Payments Made.",
        tone: statusToneMap[expense.finance_review_status || ""] ?? "slate",
      },
      {
        label: "Funding",
        value: formatLabel(expense.funding_status),
        detail: "Funding allocation is controlled by Finance/Admin.",
        tone: statusToneMap[expense.funding_status || ""] ?? "slate",
      },
      {
        label: "Coverage",
        value: formatLabel(expense.coverage_status),
        detail: `${expense.currency_code || "USD"} ${formatMoney(coveredAmount)} covered`,
        tone: statusToneMap[expense.coverage_status || ""] ?? "slate",
      },
      {
        label: "Recipient",
        value: formatLabel(expense.recipient_confirmation_status),
        detail: expense.recipient_confirmed_at
          ? `Confirmed ${formatDateTime(expense.recipient_confirmed_at)}`
          : "The person who made the expense confirms received after payment.",
        tone: statusToneMap[expense.recipient_confirmation_status || ""] ?? "slate",
      },
    ];
  }, [coveredAmount, expense]);

  const loadExpense = useCallback(async () => {
    if (!expenseId) {
      setPageError("Missing expense ID.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const expenseResult = await supabase
        .from("finance_expenses")
        .select(
          [
            "id",
            "expense_number",
            "title",
            "description",
            "amount",
            "requested_amount",
            "approved_amount",
            "final_amount",
            "currency_code",
            "expense_date",
            "expense_type",
            "category_id",
            "status",
            "approval_status",
            "payment_status",
            "request_status",
            "documentation_status",
            "finance_review_status",
            "funding_status",
            "coverage_status",
            "recipient_confirmation_status",
            "company_id",
            "employee_ref_id",
            "expense_made_by_type",
            "responsible_person_name",
            "other_made_by_explanation",
            "expense_source_name",
            "other_expense_explanation",
            "is_retroactive",
            "retroactive_reason",
            "approved_to_spend_at",
            "rejected_before_spend_at",
            "rejection_reason",
            "documentation_submitted_at",
            "verified_for_payment_at",
            "verification_notes",
            "online_platform",
            "online_order_number",
            "online_order_date",
            "online_order_url",
            "online_tracking_number",
            "online_confirmation_status",
            "online_confirmation_notes",
            "recipient_confirmed_at",
            "recipient_confirmation_notes",
            "recipient_dispute_reason",
            "notes",
            "metadata",
            "submitter_user_id",
            "created_at",
            "updated_at",
          ].join(", ")
        )
        .eq("id", expenseId)
        .single();

      if (expenseResult.error) throw expenseResult.error;

      const loadedExpense = expenseResult.data as unknown as ExpenseRow;
      setExpense(loadedExpense);
      setDocumentationLink(loadedExpense.metadata?.documentation_link || "");

      const [
        companyResult,
        employeeResult,
        allocationsResult,
        attachmentsResult,
        companiesResult,
        employeesResult,
        bankAccountsResult,
      ] = await Promise.all([
        loadedExpense.company_id
          ? supabase
              .from("finance_companies")
              .select("id, name")
              .eq("id", loadedExpense.company_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),

        loadedExpense.employee_ref_id
          ? supabase
              .from("finance_employee_refs")
              .select("id, user_id, code, status, mark, metadata")
              .eq("id", loadedExpense.employee_ref_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),

        supabase
          .from("finance_payment_made_expense_allocations")
          .select(
            [
              "id",
              "payment_made_id",
              "expense_id",
              "funding_batch_id",
              "funding_company_id",
              "paid_from_bank_account_id",
              "recipient_employee_ref_id",
              "recipient_person_name",
              "allocated_amount",
              "currency_code",
              "payment_currency_code",
              "converted_amount",
              "recipient_confirmation_status",
              "recipient_confirmation_notes",
              "recipient_dispute_reason",
              "created_at",
            ].join(", ")
          )
          .eq("expense_id", loadedExpense.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("finance_record_attachments")
          .select(
            "id, entity_type, entity_id, file_upload_id, uploaded_by, notes, metadata, created_at"
          )
          .eq("entity_type", "finance_expense")
          .eq("entity_id", loadedExpense.id)
          .order("created_at", { ascending: false }),

        supabase.from("finance_companies").select("id, name").order("name"),

        supabase
          .from("finance_employee_refs")
          .select("id, user_id, code, status, mark, metadata")
          .eq("status", "active")
          .order("code"),

        supabase
          .from("finance_bank_accounts")
          .select(
            "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id"
          )
          .order("name"),
      ]);

      if (companyResult.error) throw companyResult.error;
      if (employeeResult.error) throw employeeResult.error;
      if (allocationsResult.error) throw allocationsResult.error;
      if (attachmentsResult.error) throw attachmentsResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (employeesResult.error) throw employeesResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;

      const loadedAllocations = (allocationsResult.data || []) as unknown as AllocationRow[];
      setCompany((companyResult.data || null) as CompanyRow | null);
      setEmployee((employeeResult.data || null) as EmployeeRefRow | null);
      setAllocations(loadedAllocations);
      setCompanies((companiesResult.data || []) as CompanyRow[]);
      setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
      setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);

      const paymentIds = Array.from(
        new Set(loadedAllocations.map((item) => item.payment_made_id))
      );
      const batchIds = Array.from(
        new Set(
          loadedAllocations
            .map((item) => item.funding_batch_id)
            .filter((value): value is string => Boolean(value))
        )
      );
      const fileUploadIds = ((attachmentsResult.data || []) as AttachmentRow[]).map(
        (item) => item.file_upload_id
      );

      if (paymentIds.length > 0) {
        const paymentsResult = await supabase
          .from("finance_payments_made")
          .select(
            [
              "id",
              "amount",
              "payment_date",
              "status",
              "reference_number",
              "payment_source_type",
              "recipient_confirmation_status",
              "paid_from_company_id",
              "paid_from_bank_account_id",
              "created_at",
            ].join(", ")
          )
          .in("id", paymentIds);

        if (paymentsResult.error) throw paymentsResult.error;
        setPayments((paymentsResult.data || []) as unknown as PaymentMadeRow[]);
      } else {
        setPayments([]);
      }

      if (batchIds.length > 0) {
        const batchesResult = await supabase
          .from("finance_expense_funding_batches")
          .select(
            "id, batch_number, funding_company_id, funding_bank_account_id, allocation_date, currency_code, allocated_amount, status, documentation_status"
          )
          .in("id", batchIds);

        if (batchesResult.error) throw batchesResult.error;
        setFundingBatches((batchesResult.data || []) as FundingBatchRow[]);
      } else {
        setFundingBatches([]);
      }

      if (fileUploadIds.length > 0) {
        const fileUploadsResult = await supabase
          .from("file_uploads")
          .select("id, file_name, file_path, file_size, mime_type, entity_type, created_at")
          .in("id", fileUploadIds);

        if (fileUploadsResult.error) throw fileUploadsResult.error;

        const fileMap = new Map(
          ((fileUploadsResult.data || []) as FileUploadRow[]).map((item) => [
            item.id,
            item,
          ])
        );

        setAttachments(
          ((attachmentsResult.data || []) as AttachmentRow[]).map((attachment) => ({
            ...attachment,
            fileUpload: fileMap.get(attachment.file_upload_id) || null,
          }))
        );
      } else {
        setAttachments([]);
      }
    } catch (error) {
      console.error("Failed to load expense detail:", error);
      setPageError(error instanceof Error ? error.message : "Failed to load expense detail.");
      setExpense(null);
    } finally {
      setIsLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    void loadExpense();
  }, [loadExpense]);

  useEffect(() => {
    if (!expenseId) return undefined;

    const channel = supabase
      .channel(`finance-expense-detail-${expenseId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expenses", filter: `id=eq.${expenseId}` },
        () => void loadExpense()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payment_made_expense_allocations",
          filter: `expense_id=eq.${expenseId}`,
        },
        () => void loadExpense()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${expenseId}`,
        },
        () => void loadExpense()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadExpense();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [expenseId, loadExpense]);

  const uploadDocumentation = useCallback(async () => {
    if (!expense) return;

    if (!documentationFile && !documentationExternalLink.trim()) {
      setPageError("Upload a file or add a documentation link.");
      return;
    }

    setIsUploadingDocumentation(true);
    setPageError(null);
    setPageMessage(null);

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const userId = authResult.data.user?.id ?? null;

      if (documentationFile) {
        const resolvedMimeType = resolveMimeType(documentationFile);
        const safeFileName = documentationFile.name.replace(/[^\w.\-]+/g, "_");
        const filePath = `${expense.id}/${Date.now()}-${safeFileName}`;

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
          entity_id: expense.id,
          file_upload_id: fileUploadResult.data.id,
          uploaded_by: userId,
          notes: `Documentation for ${expense.expense_number || expense.title}`,
          metadata: {
            bucket: "finance-expense-documents",
            uploaded_from: "expenses_detail",
            resolved_mime_type: resolvedMimeType,
          },
        });

        if (attachmentResult.error) throw attachmentResult.error;
      }

      const nextDocumentationStatus =
        documentationFile && documentationExternalLink.trim()
          ? "files_and_links"
          : documentationFile
            ? "uploaded"
            : "linked";

      const updateResult = await supabase
        .from("finance_expenses")
        .update({
          documentation_status: nextDocumentationStatus,
          documentation_submitted_at: new Date().toISOString(),
          request_status:
            expense.request_status === "approved_to_spend" ||
            expense.request_status === "expense_made" ||
            expense.request_status === "draft" ||
            expense.request_status === "requested"
              ? "documentation_submitted"
              : expense.request_status,
          metadata: {
            ...(expense.metadata || {}),
            documentation_link: documentationExternalLink.trim() || null,
          },
          updated_by: userId,
        })
        .eq("id", expense.id);

      if (updateResult.error) throw updateResult.error;

      setDocumentationFile(null);
      setPageMessage("Documentation updated.");
      await loadExpense();
    } catch (error) {
      console.error("Failed to upload expense documentation:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to upload documentation."
      );
    } finally {
      setIsUploadingDocumentation(false);
    }
  }, [documentationExternalLink, documentationFile, expense, loadExpense]);

  const confirmReceived = useCallback(
    async (status: "received_confirmed" | "not_received" | "disputed") => {
      if (!expense) return;

      setIsConfirmingReceipt(true);
      setPageError(null);
      setPageMessage(null);

      try {
        const result = await supabase.rpc("finance_confirm_expense_payment_received", {
          p_expense_id: expense.id,
          p_confirmation_status: status,
          p_notes: confirmationNotes.trim() || null,
        });

        if (result.error) throw result.error;

        setConfirmationNotes("");
        setPageMessage(
          status === "received_confirmed"
            ? "Payment receipt confirmed."
            : "Recipient response saved."
        );

        await loadExpense();
      } catch (error) {
        console.error("Failed to confirm expense payment receipt:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to confirm payment receipt."
        );
      } finally {
        setIsConfirmingReceipt(false);
      }
    },
    [confirmationNotes, expense, loadExpense]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-12 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
            <div className="mt-4 text-sm text-slate-400">Loading expense detail...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-rose-400/20 bg-rose-500/10 p-12 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-200" />
            <div className="mt-4 text-lg font-semibold text-white">
              Expense not found
            </div>
            <div className="mt-2 text-sm text-rose-100">
              {pageError || "The requested expense could not be loaded."}
            </div>
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/expenses")}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Expenses
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currencyCode = expense.currency_code || "USD";

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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Receipt className="h-3.5 w-3.5" />
                  Expense Detail
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {expense.expense_number || "Expense Request"}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  {expense.title}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge value={expense.request_status || expense.status} />
                  <StatusBadge value={expense.documentation_status} />
                  <StatusBadge value={expense.finance_review_status} />
                  <StatusBadge value={expense.coverage_status} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Expense Amount
                      </div>
                      <div className="mt-2 text-xl font-semibold text-white">
                        {currencyCode} {formatMoney(expenseAmount)}
                      </div>
                    </div>
                    <Receipt className="h-5 w-5 text-cyan-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Requested/final expense amount.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Covered
                      </div>
                      <div className="mt-2 text-xl font-semibold text-emerald-100">
                        {currencyCode} {formatMoney(coveredAmount)}
                      </div>
                    </div>
                    <WalletCards className="h-5 w-5 text-emerald-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Confirmed payment allocations.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Remaining
                      </div>
                      <div className="mt-2 text-xl font-semibold text-amber-100">
                        {currencyCode} {formatMoney(remainingAmount)}
                      </div>
                    </div>
                    <Clock3 className="h-5 w-5 text-amber-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Remaining uncovered amount.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {pageError ? (
          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
            {pageError}
          </div>
        ) : null}

        {pageMessage ? (
          <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
            {pageMessage}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {timelineItems.map((item) => (
            <div
              key={item.label}
              className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl"
            >
              <div className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getStatusToneClasses(item.value.toLowerCase().replaceAll(" ", "_"))}`}>
                {item.label}
              </div>
              <div className="mt-4 text-lg font-semibold text-white">{item.value}</div>
              <div className="mt-2 text-xs leading-5 text-slate-500">{item.detail}</div>
            </div>
          ))}
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="grid gap-6">
            <SectionCard
              title="Expense Overview"
              description="Core request and company context."
              icon={Building2}
            >
              <div className="mb-5 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Requester-side editable details
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    Finance review, funding, payment allocation, and coverage are not edited here.
                  </div>
                </div>

                {isEditingOverview ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isSavingOverview}
                      onClick={cancelEditingOverview}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={isSavingOverview}
                      onClick={() => void saveOverviewEdits()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingOverview ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!canEditOverview}
                    onClick={startEditingOverview}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                )}
              </div>

              {isEditingOverview && editForm ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-300">Expense Title</span>
                    <input
                      value={editForm.title}
                      onChange={(event) => updateEditField("title", event.target.value)}
                      className={inputClass()}
                      placeholder="Expense title"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-300">Expense Company</span>
                    <select
                      value={editForm.companyId}
                      onChange={(event) => updateEditField("companyId", event.target.value)}
                      className={inputClass()}
                    >
                      <option value="">Select company</option>
                      {companies.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name || "Unnamed company"}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-300">Expense Made By Type</span>
                    <select
                      value={editForm.expenseMadeByType}
                      onChange={(event) =>
                        updateEditField(
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

                  {editForm.expenseMadeByType === "employee" ? (
                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-300">Employee</span>
                      <select
                        value={editForm.employeeRefId}
                        onChange={(event) =>
                          updateEditField("employeeRefId", event.target.value)
                        }
                        className={inputClass()}
                      >
                        <option value="">Select employee</option>
                        {employees.map((item) => (
                          <option key={item.id} value={item.id}>
                            {getEmployeeLabel(item)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {editForm.expenseMadeByType === "owner_management" ? (
                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-300">Responsible Person</span>
                      <input
                        value={editForm.responsiblePersonName}
                        onChange={(event) =>
                          updateEditField("responsiblePersonName", event.target.value)
                        }
                        className={inputClass()}
                        placeholder="Owner / manager name"
                      />
                    </label>
                  ) : null}

                  {editForm.expenseMadeByType === "other" ? (
                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-300">Other Made By Explanation</span>
                      <input
                        value={editForm.otherMadeByExplanation}
                        onChange={(event) =>
                          updateEditField("otherMadeByExplanation", event.target.value)
                        }
                        className={inputClass()}
                        placeholder="Explain who made this expense"
                      />
                    </label>
                  ) : null}

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-300">Expense Type</span>
                    <select
                      value={editForm.expenseType}
                      onChange={(event) => updateEditField("expenseType", event.target.value)}
                      className={inputClass()}
                    >
                      {EXPENSE_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-300">Expense Date</span>
                    <input
                      type="date"
                      value={editForm.expenseDate}
                      onChange={(event) => updateEditField("expenseDate", event.target.value)}
                      className={inputClass()}
                    />
                  </label>

                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-300">Expense Source</span>
                    <input
                      value={editForm.expenseSourceName}
                      onChange={(event) =>
                        updateEditField("expenseSourceName", event.target.value)
                      }
                      className={inputClass()}
                      placeholder="Where this expense comes from"
                    />
                  </label>

                  {editForm.expenseType === "other" ? (
                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-300">Other Expense Explanation</span>
                      <input
                        value={editForm.otherExpenseExplanation}
                        onChange={(event) =>
                          updateEditField("otherExpenseExplanation", event.target.value)
                        }
                        className={inputClass()}
                        placeholder="Explain the Other expense type"
                      />
                    </label>
                  ) : null}

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-300">Expense Amount</span>
                    <input
                      value={editForm.amount}
                      onChange={(event) => updateEditField("amount", event.target.value)}
                      className={inputClass()}
                      inputMode="decimal"
                      placeholder="0.00"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-300">Currency</span>
                    <select
                      value={editForm.currencyCode}
                      onChange={(event) =>
                        updateEditField("currencyCode", event.target.value.toUpperCase())
                      }
                      className={inputClass()}
                    >
                      {CURRENCY_CODES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={editForm.isRetroactive}
                      onChange={(event) =>
                        updateEditField("isRetroactive", event.target.checked)
                      }
                      className="h-4 w-4 rounded border-white/20 bg-black/20"
                    />
                    <span className="text-sm text-slate-300">
                      Retroactive expense already happened
                    </span>
                  </label>

                  {editForm.isRetroactive ? (
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-300">Retroactive Reason</span>
                      <input
                        value={editForm.retroactiveReason}
                        onChange={(event) =>
                          updateEditField("retroactiveReason", event.target.value)
                        }
                        className={inputClass()}
                        placeholder="Why this was not requested before spending"
                      />
                    </label>
                  ) : null}

                  {editForm.expenseType === "online_shopping" ? (
                    <>
                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-slate-300">Online Platform</span>
                        <input
                          value={editForm.onlinePlatform}
                          onChange={(event) =>
                            updateEditField("onlinePlatform", event.target.value)
                          }
                          className={inputClass()}
                          placeholder="Amazon, Alibaba, Taobao..."
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-slate-300">Order Number</span>
                        <input
                          value={editForm.onlineOrderNumber}
                          onChange={(event) =>
                            updateEditField("onlineOrderNumber", event.target.value)
                          }
                          className={inputClass()}
                          placeholder="Order number"
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-slate-300">Order Date</span>
                        <input
                          type="date"
                          value={editForm.onlineOrderDate}
                          onChange={(event) =>
                            updateEditField("onlineOrderDate", event.target.value)
                          }
                          className={inputClass()}
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-slate-300">Tracking Number</span>
                        <input
                          value={editForm.onlineTrackingNumber}
                          onChange={(event) =>
                            updateEditField("onlineTrackingNumber", event.target.value)
                          }
                          className={inputClass()}
                          placeholder="Tracking number"
                        />
                      </label>

                      <label className="grid gap-2 md:col-span-2">
                        <span className="text-sm font-medium text-slate-300">Order URL</span>
                        <input
                          value={editForm.onlineOrderUrl}
                          onChange={(event) =>
                            updateEditField("onlineOrderUrl", event.target.value)
                          }
                          className={inputClass()}
                          placeholder="Online order link"
                        />
                      </label>
                    </>
                  ) : null}

                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-300">Description / Reason</span>
                    <textarea
                      value={editForm.description}
                      onChange={(event) =>
                        updateEditField("description", event.target.value)
                      }
                      className={textareaClass()}
                      placeholder="Explain why this expense is needed"
                    />
                  </label>

                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-300">Internal Notes</span>
                    <textarea
                      value={editForm.notes}
                      onChange={(event) => updateEditField("notes", event.target.value)}
                      className={textareaClass()}
                      placeholder="Optional notes"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <ValueBlock label="Expense Company" value={company?.name || "—"} />
                  <ValueBlock label="Expense Made By" value={expenseMadeByLabel} />
                  <ValueBlock label="Expense Type" value={formatLabel(expense.expense_type)} />
                  <ValueBlock
                    label="Expense Source"
                    value={expense.expense_source_name || "—"}
                    detail="Where this expense comes from or what generated the cost."
                  />
                  <ValueBlock label="Expense Date" value={formatDate(expense.expense_date)} />
                  <ValueBlock label="Currency" value={currencyCode} />
                  <ValueBlock
                    label="Description"
                    value={expense.description || "—"}
                    detail={expense.notes || undefined}
                  />
                  <ValueBlock
                    label="Retroactive"
                    value={expense.is_retroactive ? "Yes" : "No"}
                    detail={expense.retroactive_reason || undefined}
                  />
                  {expense.other_expense_explanation ? (
                    <ValueBlock
                      label="Other Expense Explanation"
                      value={expense.other_expense_explanation}
                    />
                  ) : null}
                  {expense.rejection_reason ? (
                    <ValueBlock label="Rejection Reason" value={expense.rejection_reason} />
                  ) : null}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Supporting Documentation"
              description="Expense proof files and links. Finance verification cannot happen without documentation."
              icon={FileCheck2}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-300">
                    Upload Documentation
                  </span>
                  <div className="rounded-[24px] border border-dashed border-white/15 bg-black/20 p-4">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                      onChange={(event) =>
                        setDocumentationFile(event.target.files?.[0] ?? null)
                      }
                      className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-100"
                    />
                    {documentationFile ? (
                      <div className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                        {documentationFile.name}
                      </div>
                    ) : null}
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-300">
                    Documentation Link
                  </span>
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={documentationLink}
                      onChange={(event) => setDocumentationLink(event.target.value)}
                      className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30"
                      placeholder="Receipt, order, Drive, or portal link"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isUploadingDocumentation}
                    onClick={() => void uploadDocumentation()}
                    className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploadingDocumentation ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UploadCloud className="h-4 w-4" />
                    )}
                    Update Documentation
                  </button>
                </label>
              </div>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                <div className="border-b border-white/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Uploaded Files
                </div>
                {attachments.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">
                    No uploaded documentation files yet.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">
                            {attachment.fileUpload?.file_name || "File"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {attachment.fileUpload?.mime_type || "Unknown type"} •{" "}
                            {formatDateTime(attachment.created_at)}
                          </div>
                        </div>
                        <FileText className="h-4 w-4 shrink-0 text-cyan-200" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>

            {expense.expense_type === "online_shopping" ? (
              <SectionCard
                title="Online Shopping Confirmation"
                description="Order information for Finance confirmation."
                icon={ShoppingCart}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <ValueBlock label="Online Platform" value={expense.online_platform || "—"} />
                  <ValueBlock label="Order Number" value={expense.online_order_number || "—"} />
                  <ValueBlock label="Order Date" value={formatDate(expense.online_order_date)} />
                  <ValueBlock
                    label="Tracking Number"
                    value={expense.online_tracking_number || "—"}
                  />
                  <ValueBlock
                    label="Order URL"
                    value={
                      expense.online_order_url ? (
                        <span className="break-all text-cyan-200">
                          {expense.online_order_url}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <ValueBlock
                    label="Confirmation Status"
                    value={<StatusBadge value={expense.online_confirmation_status} />}
                    detail={expense.online_confirmation_notes || undefined}
                  />
                </div>
              </SectionCard>
            ) : null}

            <SectionCard
              title="Funding & Payment Coverage"
              description="Shows what Finance/Admin allocated and which Payment Made records covered this expense."
              icon={WalletCards}
            >
              {allocations.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <WalletCards className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    No payment allocations yet
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Finance/Admin will allocate funds and create Payment Made from the Payments
                    Made tab.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
                  <table className="w-full min-w-[1100px] border-collapse">
                    <thead className="border-b border-white/10 bg-black/30">
                      <tr>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Payment Made
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Funding Company
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Bank Account
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Funding Batch
                        </th>
                        <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Allocated
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Recipient
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map((allocation) => {
                        const payment = paymentMap.get(allocation.payment_made_id) || null;
                        const fundingCompany = allocation.funding_company_id
                          ? companyMap.get(allocation.funding_company_id)
                          : null;
                        const bank = allocation.paid_from_bank_account_id
                          ? bankAccountMap.get(allocation.paid_from_bank_account_id) ?? null
                          : null;
                        const batch = allocation.funding_batch_id
                          ? fundingBatchMap.get(allocation.funding_batch_id)
                          : null;

                        return (
                          <tr
                            key={allocation.id}
                            className="border-b border-white/5 text-sm text-slate-300"
                          >
                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/finance/transactions/payments-made/${allocation.payment_made_id}`
                                  )
                                }
                                className="font-semibold text-cyan-200 transition hover:text-cyan-100"
                              >
                                {payment?.reference_number || "Payment Made"}
                              </button>
                              <div className="mt-1 text-xs text-slate-500">
                                {payment ? formatDate(payment.payment_date) : "—"} •{" "}
                                {payment?.status || "—"}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {fundingCompany?.name || "—"}
                            </td>
                            <td className="px-5 py-4">{getBankLabel(bank)}</td>
                            <td className="px-5 py-4">
                              {batch?.batch_number || "—"}
                              {batch ? (
                                <div className="mt-1 text-xs text-slate-500">
                                  {formatDate(batch.allocation_date)}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-5 py-4 text-right font-semibold text-white">
                              {allocation.currency_code || currencyCode}{" "}
                              {formatMoney(
                                allocation.converted_amount || allocation.allocated_amount
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge value={allocation.recipient_confirmation_status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>

          <aside className="sticky top-6 grid gap-6">
            <SectionCard
              title="Finance Status"
              description="Read-only Finance/Admin workflow status."
              icon={ShieldCheck}
            >
              <div className="grid gap-3">
                <ValueBlock
                  label="Request Status"
                  value={<StatusBadge value={expense.request_status || expense.status} />}
                />
                <ValueBlock
                  label="Documentation"
                  value={<StatusBadge value={expense.documentation_status} />}
                />
                <ValueBlock
                  label="Finance Review"
                  value={<StatusBadge value={expense.finance_review_status} />}
                />
                <ValueBlock
                  label="Funding"
                  value={<StatusBadge value={expense.funding_status} />}
                />
                <ValueBlock
                  label="Coverage"
                  value={<StatusBadge value={expense.coverage_status} />}
                />
                <ValueBlock
                  label="Recipient Confirmation"
                  value={<StatusBadge value={expense.recipient_confirmation_status} />}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Recipient Confirmation"
              description="After Finance marks payment made, the person who made the expense confirms received or reports an issue."
              icon={CheckCircle2}
            >
              <div className="grid gap-4">
                <textarea
                  value={confirmationNotes}
                  onChange={(event) => setConfirmationNotes(event.target.value)}
                  className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30"
                  placeholder="Optional confirmation note"
                />

                <div className="grid gap-3">
                  <button
                    type="button"
                    disabled={
                      isConfirmingReceipt ||
                      expense.recipient_confirmation_status === "not_paid_yet"
                    }
                    onClick={() => void confirmReceived("received_confirmed")}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isConfirmingReceipt ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Confirm Received
                  </button>

                  <button
                    type="button"
                    disabled={
                      isConfirmingReceipt ||
                      expense.recipient_confirmation_status === "not_paid_yet"
                    }
                    onClick={() => void confirmReceived("not_received")}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Not Received
                  </button>

                  <button
                    type="button"
                    disabled={
                      isConfirmingReceipt ||
                      expense.recipient_confirmation_status === "not_paid_yet"
                    }
                    onClick={() => void confirmReceived("disputed")}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Dispute
                  </button>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-xs leading-5 text-slate-500">
                  Confirmation actions are disabled until Finance creates a confirmed Payment Made
                  allocation and the recipient status becomes pending confirmation.
                </div>
              </div>
            </SectionCard>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => void loadExpense()}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                <RefreshCcw className="h-4 w-4" />
                Reload
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
