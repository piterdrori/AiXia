import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Loader2,
  Receipt,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type FundingBatchRow = {
  id: string;
  batch_number: string;
  funding_company_id: string;
  funding_bank_account_id: string | null;
  allocation_date: string;
  currency_code: string | null;
  allocated_amount: number | string | null;
  allocated_by: string | null;
  status: string;
  documentation_status: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type FundingBatchLineRow = {
  id: string;
  funding_batch_id: string;
  expense_id: string;
  expense_company_id: string | null;
  expense_made_by_type: string | null;
  employee_ref_id: string | null;
  responsible_person_name: string | null;
  approved_amount: number | string | null;
  allocated_amount: number | string | null;
  currency_code: string | null;
  status: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

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
  request_status: string | null;
  finance_review_status: string | null;
  documentation_status: string | null;
  funding_status: string | null;
  coverage_status: string | null;
  recipient_confirmation_status: string | null;
  company_id: string | null;
  employee_ref_id: string | null;
  expense_made_by_type: string | null;
  responsible_person_name: string | null;
  other_made_by_explanation: string | null;
  expense_source_name: string | null;
  online_platform: string | null;
  online_order_number: string | null;
  created_at: string;
  updated_at: string;
};

type CompanyRow = {
  id: string;
  name: string | null;
};

type BankAccountRow = {
  id: string;
  name: string | null;
  bank_name: string | null;
  institution_name: string | null;
  masked_account_number: string | null;
  currency_code: string | null;
  company_id: string | null;
  is_default: boolean | null;
};

type EmployeeRefRow = {
  id: string;
  user_id: string | null;
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

type EnrichedLine = FundingBatchLineRow & {
  expense: ExpenseRow | null;
  expenseCompanyName: string;
  madeByLabel: string;
  targetAmount: number;
};

const statusToneMap: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  draft: "slate",
  allocated: "emerald",
  cancelled: "rose",
  archived: "amber",
  deleted: "rose",
  missing: "rose",
  uploaded: "cyan",
  linked: "cyan",
  files_and_links: "cyan",
  verified: "emerald",
  issue_found: "rose",
  verified_for_payment: "emerald",
  approved_for_payment: "emerald",
  pending_review: "amber",
  not_allocated: "slate",
  partially_allocated: "amber",
  allocation_cancelled: "rose",
  allocated_batch: "violet",
  not_covered: "slate",
  partially_covered: "amber",
  covered: "emerald",
  not_paid_yet: "slate",
  pending_confirmation: "amber",
  received_confirmed: "emerald",
  not_received: "rose",
  disputed: "rose",
  paid: "emerald",
  partially_paid: "amber",
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

function ValueBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
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
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="flex items-start gap-4 border-b border-white/10 px-5 py-4">
        <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200">
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

function ActionButton({
  label,
  icon: Icon,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof CheckCircle2;
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15",
    emerald:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15",
    amber:
      "border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15",
    violet:
      "border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15",
    slate: "border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]",
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

function getBankLabel(bank: BankAccountRow | null | undefined) {
  if (!bank) return "—";

  return [
    bank.name || bank.bank_name || bank.institution_name || "Bank Account",
    bank.currency_code,
    bank.masked_account_number,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getEmployeeLabel(employee: EmployeeRefRow | null | undefined) {
  if (!employee) return "—";

  const role = employee.metadata?.job_title || employee.metadata?.source_role || employee.mark;
  const company = employee.metadata?.company;

  return [employee.code || "Employee", role, company].filter(Boolean).join(" • ");
}

function getExpenseTargetAmount(expense: ExpenseRow | null) {
  if (!expense) return 0;

  return toNumber(
    expense.final_amount ||
      expense.approved_amount ||
      expense.requested_amount ||
      expense.amount
  );
}

function getExpenseMadeByLabel(
  line: FundingBatchLineRow,
  expense: ExpenseRow | null,
  employeeMap: Map<string, EmployeeRefRow>
) {
  const employeeId = line.employee_ref_id || expense?.employee_ref_id || null;
  const madeByType = line.expense_made_by_type || expense?.expense_made_by_type || null;

  if (madeByType === "employee" && employeeId) {
    return getEmployeeLabel(employeeMap.get(employeeId));
  }

  if (madeByType === "owner_management") {
    return line.responsible_person_name || expense?.responsible_person_name || "Owner / Management";
  }

  if (madeByType === "company_direct") {
    return "Company Direct";
  }

  if (madeByType === "other") {
    return expense?.other_made_by_explanation || "Other";
  }

  return "—";
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

export default function FinanceExpenseFundingBatchDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const batchId = params.id;

  const [batch, setBatch] = useState<FundingBatchRow | null>(null);
  const [lines, setLines] = useState<FundingBatchLineRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentWithFile[]>([]);
  const [allocationProofFile, setAllocationProofFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((bank) => [bank.id, bank]));
  }, [bankAccounts]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee]));
  }, [employees]);

  const expenseMap = useMemo(() => {
    return new Map(expenses.map((expense) => [expense.id, expense]));
  }, [expenses]);

  const currencyCode = batch?.currency_code || lines[0]?.currency_code || "USD";

  const fundingCompany = batch ? companyMap.get(batch.funding_company_id) || null : null;
  const fundingBankAccount =
    batch?.funding_bank_account_id ? bankAccountMap.get(batch.funding_bank_account_id) || null : null;

  const activeLines = useMemo(() => {
    return lines.filter((line) => line.status !== "cancelled");
  }, [lines]);

  const totalAllocated = useMemo(() => {
    return activeLines.reduce((sum, line) => sum + toNumber(line.allocated_amount), 0);
  }, [activeLines]);

  const totalApproved = useMemo(() => {
    return activeLines.reduce((sum, line) => sum + toNumber(line.approved_amount), 0);
  }, [activeLines]);

  const enrichedLines = useMemo<EnrichedLine[]>(() => {
    return activeLines.map((line) => {
      const expense = expenseMap.get(line.expense_id) || null;
      const expenseCompanyId = line.expense_company_id || expense?.company_id || null;

      return {
        ...line,
        expense,
        expenseCompanyName: expenseCompanyId
          ? companyMap.get(expenseCompanyId)?.name || "Unknown company"
          : "No company",
        madeByLabel: getExpenseMadeByLabel(line, expense, employeeMap),
        targetAmount: getExpenseTargetAmount(expense),
      };
    });
  }, [activeLines, companyMap, employeeMap, expenseMap]);

  const loadBatch = useCallback(async () => {
    if (!batchId) {
      setPageError("Missing funding batch ID.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const batchResult = await supabase
        .from("finance_expense_funding_batches")
        .select(
          [
            "id",
            "batch_number",
            "funding_company_id",
            "funding_bank_account_id",
            "allocation_date",
            "currency_code",
            "allocated_amount",
            "allocated_by",
            "status",
            "documentation_status",
            "notes",
            "metadata",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
          ].join(", ")
        )
        .eq("id", batchId)
        .single();

      if (batchResult.error) throw batchResult.error;

      const loadedBatch = batchResult.data as FundingBatchRow;
      setBatch(loadedBatch);

      const [
        linesResult,
        companiesResult,
        bankAccountsResult,
        employeesResult,
        attachmentsResult,
      ] = await Promise.all([
        supabase
          .from("finance_expense_funding_batch_lines")
          .select(
            [
              "id",
              "funding_batch_id",
              "expense_id",
              "expense_company_id",
              "expense_made_by_type",
              "employee_ref_id",
              "responsible_person_name",
              "approved_amount",
              "allocated_amount",
              "currency_code",
              "status",
              "notes",
              "metadata",
              "created_at",
              "updated_at",
              "created_by",
              "updated_by",
            ].join(", ")
          )
          .eq("funding_batch_id", loadedBatch.id)
          .order("created_at", { ascending: true }),

        supabase.from("finance_companies").select("id, name").order("name"),

        supabase
          .from("finance_bank_accounts")
          .select(
            "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id, is_default"
          )
          .order("name"),

        supabase
          .from("finance_employee_refs")
          .select("id, user_id, code, status, mark, metadata")
          .order("code"),

        supabase
          .from("finance_record_attachments")
          .select(
            "id, entity_type, entity_id, file_upload_id, uploaded_by, notes, metadata, created_at"
          )
          .eq("entity_type", "finance_expense_funding_batch")
          .eq("entity_id", loadedBatch.id)
          .order("created_at", { ascending: false }),
      ]);

      if (linesResult.error) throw linesResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (employeesResult.error) throw employeesResult.error;
      if (attachmentsResult.error) throw attachmentsResult.error;

      const loadedLines = (linesResult.data || []) as FundingBatchLineRow[];
      setLines(loadedLines);
      setCompanies((companiesResult.data || []) as CompanyRow[]);
      setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
      setEmployees((employeesResult.data || []) as EmployeeRefRow[]);

      const expenseIds = Array.from(new Set(loadedLines.map((line) => line.expense_id)));

      if (expenseIds.length > 0) {
        const expensesResult = await supabase
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
              "request_status",
              "finance_review_status",
              "documentation_status",
              "funding_status",
              "coverage_status",
              "recipient_confirmation_status",
              "company_id",
              "employee_ref_id",
              "expense_made_by_type",
              "responsible_person_name",
              "other_made_by_explanation",
              "expense_source_name",
              "online_platform",
              "online_order_number",
              "created_at",
              "updated_at",
            ].join(", ")
          )
          .in("id", expenseIds);

        if (expensesResult.error) throw expensesResult.error;

        setExpenses((expensesResult.data || []) as unknown as ExpenseRow[]);
      } else {
        setExpenses([]);
      }

      const attachmentRows = (attachmentsResult.data || []) as AttachmentRow[];
      const fileUploadIds = attachmentRows.map((attachment) => attachment.file_upload_id);

      if (fileUploadIds.length > 0) {
        const fileUploadsResult = await supabase
          .from("file_uploads")
          .select("id, file_name, file_path, file_size, mime_type, entity_type, created_at")
          .in("id", fileUploadIds);

        if (fileUploadsResult.error) throw fileUploadsResult.error;

        const fileMap = new Map(
          ((fileUploadsResult.data || []) as FileUploadRow[]).map((file) => [
            file.id,
            file,
          ])
        );

        setAttachments(
          attachmentRows.map((attachment) => ({
            ...attachment,
            fileUpload: fileMap.get(attachment.file_upload_id) || null,
          }))
        );
      } else {
        setAttachments([]);
      }
    } catch (error) {
      console.error("Failed to load funding allocation batch:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to load funding allocation batch."
      );
      setBatch(null);
    } finally {
      setIsLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void loadBatch();
  }, [loadBatch]);

  useEffect(() => {
    if (!batchId) return undefined;

    const channel = supabase
      .channel(`finance-expense-funding-batch-detail-${batchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_expense_funding_batches",
          filter: `id=eq.${batchId}`,
        },
        () => void loadBatch()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_expense_funding_batch_lines",
          filter: `funding_batch_id=eq.${batchId}`,
        },
        () => void loadBatch()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${batchId}`,
        },
        () => void loadBatch()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadBatch();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [batchId, loadBatch]);

  const runBatchRpc = useCallback(
    async (
      rpcName: string,
      args: Record<string, string | number | null>,
      successMessage: string
    ) => {
      setIsRunningAction(true);
      setPageError(null);
      setPageMessage(null);

      try {
        const result = await supabase.rpc(rpcName, args);
        if (result.error) throw result.error;

        setPageMessage(successMessage);
        await loadBatch();
      } catch (error) {
        console.error(`Failed to run ${rpcName}:`, error);
        setPageError(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setIsRunningAction(false);
      }
    },
    [loadBatch]
  );

  const markAllocated = useCallback(async () => {
    if (!batch) return;

    await runBatchRpc(
      "finance_mark_expense_funding_batch_allocated",
      {
        p_batch_id: batch.id,
      },
      "Funding allocation marked allocated."
    );
  }, [batch, runBatchRpc]);

  const markDocumentation = useCallback(
    async (
      documentationStatus:
        | "uploaded"
        | "linked"
        | "files_and_links"
        | "verified"
        | "issue_found"
    ) => {
      if (!batch) return;

      const notes = window.prompt("Documentation notes, optional", "") || null;

      await runBatchRpc(
        "finance_mark_expense_funding_batch_documentation",
        {
          p_batch_id: batch.id,
          p_documentation_status: documentationStatus,
          p_notes: notes,
        },
        "Funding allocation documentation updated."
      );
    },
    [batch, runBatchRpc]
  );

  const removeExpenseLine = useCallback(
    async (line: EnrichedLine) => {
      if (!batch) return;

      const confirmed = window.confirm(
        `Remove ${line.expense?.expense_number || "this expense"} from this funding allocation?`
      );

      if (!confirmed) return;

      await runBatchRpc(
        "finance_remove_expense_from_funding_batch",
        {
          p_batch_id: batch.id,
          p_expense_id: line.expense_id,
        },
        "Expense removed from funding allocation."
      );
    },
    [batch, runBatchRpc]
  );

  const uploadAllocationProof = useCallback(async () => {
    if (!batch || !allocationProofFile) return;

    setIsUploadingProof(true);
    setPageError(null);
    setPageMessage(null);

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const userId = authResult.data.user?.id ?? null;
      const resolvedMimeType = resolveMimeType(allocationProofFile);
      const safeFileName = allocationProofFile.name.replace(/[^\w.\-]+/g, "_");
      const filePath = `${batch.id}/${Date.now()}-${safeFileName}`;

      const uploadResult = await supabase.storage
        .from("finance-expense-funding-batch-documents")
        .upload(filePath, allocationProofFile, {
          contentType: resolvedMimeType,
          upsert: false,
        });

      if (uploadResult.error) throw uploadResult.error;

      const fileUploadResult = await supabase
        .from("file_uploads")
        .insert({
          user_id: userId,
          file_name: allocationProofFile.name,
          file_path: uploadResult.data.path,
          file_size: allocationProofFile.size,
          mime_type: resolvedMimeType,
          entity_type: "finance_expense_funding_batch",
        })
        .select("id")
        .single();

      if (fileUploadResult.error) throw fileUploadResult.error;

      const attachmentResult = await supabase.from("finance_record_attachments").insert({
        entity_type: "finance_expense_funding_batch",
        entity_id: batch.id,
        file_upload_id: fileUploadResult.data.id,
        uploaded_by: userId,
        notes: "Funding allocation proof",
        metadata: {
          bucket: "finance-expense-funding-batch-documents",
          uploaded_from: "funding_allocation_detail_page",
          resolved_mime_type: resolvedMimeType,
        },
      });

      if (attachmentResult.error) throw attachmentResult.error;

      const documentationResult = await supabase.rpc(
        "finance_mark_expense_funding_batch_documentation",
        {
          p_batch_id: batch.id,
          p_documentation_status: "uploaded",
          p_notes: "Funding allocation proof uploaded.",
        }
      );

      if (documentationResult.error) throw documentationResult.error;

      setAllocationProofFile(null);
      setPageMessage("Funding allocation proof uploaded.");
      await loadBatch();
    } catch (error) {
      console.error("Failed to upload funding allocation proof:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to upload funding allocation proof."
      );
    } finally {
      setIsUploadingProof(false);
    }
  }, [allocationProofFile, batch, loadBatch]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-12 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-200" />
            <div className="mt-4 text-sm text-slate-400">
              Loading funding allocation batch...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-rose-400/20 bg-rose-500/10 p-12 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-200" />
            <div className="mt-4 text-lg font-semibold text-white">
              Funding allocation not found
            </div>
            <div className="mt-2 text-sm text-rose-100">
              {pageError || "The requested funding allocation could not be loaded."}
            </div>
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/expenses-payments-made")}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Operating Expense Payments
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canEditDraft = batch.status === "draft";

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/expenses-payments-made")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Operating Expense Payments
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Funding Allocation Detail
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {batch.batch_number}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Internal reserved funds for approved operating expenses before the actual
                  outgoing payment is created.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge value={batch.status} />
                  <StatusBadge value={batch.documentation_status} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Planned Allocation
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {currencyCode} {formatMoney(totalAllocated)}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Sum of active batch lines.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Approved Amount
                  </div>
                  <div className="mt-2 text-xl font-semibold text-emerald-100">
                    {currencyCode} {formatMoney(totalApproved)}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Approved request total.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Expenses
                  </div>
                  <div className="mt-2 text-xl font-semibold text-violet-100">
                    {activeLines.length}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Included in this batch.
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

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="grid gap-6">
            <SectionCard
              title="Funding Allocation Overview"
              description="Funding source, allocation identity, and documentation status."
              icon={Archive}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <ValueBlock label="Batch Number" value={batch.batch_number} />
                <ValueBlock label="Allocation Date" value={formatDate(batch.allocation_date)} />
                <ValueBlock label="Funding Company" value={fundingCompany?.name || "—"} />
                <ValueBlock label="Funding Bank" value={getBankLabel(fundingBankAccount)} />
                <ValueBlock label="Currency" value={batch.currency_code || "—"} />
                <ValueBlock label="Status" value={<StatusBadge value={batch.status} />} />
                <ValueBlock
                  label="Documentation"
                  value={<StatusBadge value={batch.documentation_status} />}
                />
                <ValueBlock
                  label="Created"
                  value={formatDateTime(batch.created_at)}
                  detail={`Updated ${formatDateTime(batch.updated_at)}`}
                />
                {batch.notes ? <ValueBlock label="Notes" value={batch.notes} /> : null}
              </div>
            </SectionCard>

            <SectionCard
              title="Included Expenses"
              description="Approved / verified expenses reserved inside this funding allocation."
              icon={Receipt}
            >
              {enrichedLines.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <Receipt className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    No expenses in this funding allocation
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">
                    Add expenses from the funding allocation create page.
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
                  <div className="max-h-[720px] overflow-y-auto">
                    <table className="w-full min-w-[1480px] border-collapse">
                      <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                        <tr>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Expense
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            What Is It For
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Expense Company
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Made By
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Approved
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Allocated
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Line Status
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Expense Funding
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {enrichedLines.map((line) => (
                          <tr
                            key={line.id}
                            className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                          >
                            <td className="min-w-[240px] px-5 py-4">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/finance/transactions/expenses-payments-made/review/${line.expense_id}`
                                  )
                                }
                                className="text-left font-semibold text-cyan-200 transition hover:text-cyan-100"
                              >
                                {line.expense?.expense_number || "Expense"}
                              </button>
                              <div className="mt-1 text-xs text-white">
                                {line.expense?.title || "—"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {formatDate(line.expense?.expense_date)}
                              </div>
                            </td>

                            <td className="min-w-[300px] px-5 py-4">
                              <div className="font-medium text-white">
                                {line.expense?.expense_source_name || "No source entered"}
                              </div>
                              <div className="mt-1 text-xs text-violet-200">
                                {formatLabel(line.expense?.expense_type)}
                              </div>
                              <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                                {line.expense?.description || "No description / reason entered."}
                              </div>
                            </td>

                            <td className="min-w-[180px] px-5 py-4">
                              {line.expenseCompanyName}
                            </td>

                            <td className="min-w-[220px] px-5 py-4">
                              <div className="font-medium text-slate-200">
                                {line.madeByLabel}
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
                              {line.currency_code || currencyCode}{" "}
                              {formatMoney(line.approved_amount || line.targetAmount)}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
                              {line.currency_code || currencyCode}{" "}
                              {formatMoney(line.allocated_amount)}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <StatusBadge value={line.status} />
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <StatusBadge value={line.expense?.funding_status} />
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end">
                                <ActionButton
                                  label="Remove"
                                  icon={Trash2}
                                  tone="rose"
                                  disabled={isRunningAction || !canEditDraft}
                                  onClick={() => void removeExpenseLine(line)}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Allocation Proof"
              description="Files uploaded as proof that funds were reserved or allocated."
              icon={UploadCloud}
            >
              {attachments.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <FileText className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    No allocation proof uploaded
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">
                    Upload bank confirmation, internal approval, or allocation document.
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-white/5 overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
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
                      <FileText className="h-4 w-4 shrink-0 text-violet-200" />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <aside className="sticky top-6 grid gap-6">
            <SectionCard
              title="Action Center"
              description="Confirm allocation, upload proof, and create real payment."
              icon={ShieldCheck}
            >
              <div className="grid gap-3">
                <ActionButton
                  label="Mark Allocated"
                  icon={CheckCircle2}
                  tone="emerald"
                  disabled={isRunningAction || batch.status !== "draft"}
                  onClick={() => void markAllocated()}
                />

                <ActionButton
                  label="Verify Docs"
                  icon={FileCheck2}
                  tone="violet"
                  disabled={isRunningAction}
                  onClick={() => void markDocumentation("verified")}
                />

                <ActionButton
                  label="Create Expense Payment"
                  icon={WalletCards}
                  tone="cyan"
                  disabled={isRunningAction}
                  onClick={() =>
                    navigate(
                      `/finance/transactions/expenses-payments-made/new?source=batch&batchId=${batch.id}`
                    )
                  }
                />

                <ActionButton
                  label="Reload"
                  icon={RefreshCcw}
                  tone="slate"
                  disabled={isRunningAction}
                  onClick={() => void loadBatch()}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Upload Proof"
              description="Attach funding allocation documentation."
              icon={UploadCloud}
            >
              <div className="rounded-[24px] border border-dashed border-white/15 bg-black/20 p-4">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                  onChange={(event) =>
                    setAllocationProofFile(event.target.files?.[0] ?? null)
                  }
                  className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-violet-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-violet-100"
                />

                {allocationProofFile ? (
                  <div className="mt-3 rounded-2xl border border-violet-400/15 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
                    {allocationProofFile.name}
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={isUploadingProof || !allocationProofFile}
                  onClick={() => void uploadAllocationProof()}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploadingProof ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4" />
                  )}
                  Upload Proof
                </button>
              </div>
            </SectionCard>

            <SectionCard
              title="Status Summary"
              description="Current allocation state."
              icon={Clock3}
            >
              <div className="grid gap-3">
                <ValueBlock label="Batch Status" value={<StatusBadge value={batch.status} />} />
                <ValueBlock
                  label="Documentation"
                  value={<StatusBadge value={batch.documentation_status} />}
                />
                <ValueBlock
                  label="Line Count"
                  value={String(activeLines.length)}
                  detail="Active expenses included in this funding allocation."
                />
                <ValueBlock
                  label="Allocated By"
                  value={batch.allocated_by ? "Recorded" : "Not allocated yet"}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Meaning"
              description="What this funding allocation represents."
              icon={Banknote}
            >
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-xs leading-5 text-slate-500">
                Funding Allocation means internal money was reserved or approved for selected
                expenses. It is not the real outgoing payment. Actual payment is created from the
                Expense Payment page.
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
