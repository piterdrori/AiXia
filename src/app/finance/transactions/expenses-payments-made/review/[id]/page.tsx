import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Loader2,
  PackageCheck,
  Receipt,
  RefreshCcw,
  ShieldCheck,
  ShoppingCart,
  WalletCards,
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
  notes: string | null;
  metadata: {
    documentation_link?: string | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
  updated_at: string;
};

type CompanyRow = {
  id: string;
  name: string | null;
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

type AllocationRow = {
  id: string;
  payment_made_id: string;
  expense_id: string;
  funding_batch_id: string | null;
  funding_company_id: string | null;
  paid_from_bank_account_id: string | null;
  allocated_amount: number | string | null;
  currency_code: string | null;
  converted_amount: number | string | null;
  recipient_confirmation_status: string | null;
  created_at: string;
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

const statusToneMap: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  draft: "slate",
  submitted: "cyan",
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
  rejected: "rose",
  needs_correction: "amber",
  not_allocated: "slate",
  partially_allocated: "amber",
  allocated: "emerald",
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

function getEmployeeLabel(employee: EmployeeRefRow | null | undefined) {
  if (!employee) return "—";

  const role = employee.metadata?.job_title || employee.metadata?.source_role || employee.mark;
  const company = employee.metadata?.company;

  return [employee.code || "Employee", role, company].filter(Boolean).join(" • ");
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

export default function FinanceExpensePaymentReviewPage() {
  const navigate = useNavigate();
  const params = useParams();
  const expenseId = params.id;

  const [expense, setExpense] = useState<ExpenseRow | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [employee, setEmployee] = useState<EmployeeRefRow | null>(null);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentWithFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const currencyCode = expense?.currency_code || "USD";

  const expenseAmount = useMemo(() => {
    return toNumber(expense?.final_amount || expense?.approved_amount || expense?.requested_amount || expense?.amount);
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

  const documentationLink = expense?.metadata?.documentation_link || expense?.online_order_url || "";

  const loadReview = useCallback(async () => {
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
            "notes",
            "metadata",
            "created_at",
            "updated_at",
          ].join(", ")
        )
        .eq("id", expenseId)
        .single();

      if (expenseResult.error) throw expenseResult.error;

      const loadedExpense = expenseResult.data as unknown as ExpenseRow;
      setExpense(loadedExpense);

      const [companyResult, employeeResult, allocationsResult, attachmentsResult] =
        await Promise.all([
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
                "allocated_amount",
                "currency_code",
                "converted_amount",
                "recipient_confirmation_status",
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
        ]);

      if (companyResult.error) throw companyResult.error;
      if (employeeResult.error) throw employeeResult.error;
      if (allocationsResult.error) throw allocationsResult.error;
      if (attachmentsResult.error) throw attachmentsResult.error;

      setCompany((companyResult.data || null) as CompanyRow | null);
      setEmployee((employeeResult.data || null) as EmployeeRefRow | null);
      setAllocations((allocationsResult.data || []) as unknown as AllocationRow[]);

      const attachmentRows = (attachmentsResult.data || []) as AttachmentRow[];
      const fileUploadIds = attachmentRows.map((item) => item.file_upload_id);

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
          attachmentRows.map((attachment) => ({
            ...attachment,
            fileUpload: fileMap.get(attachment.file_upload_id) || null,
          }))
        );
      } else {
        setAttachments([]);
      }
    } catch (error) {
      console.error("Failed to load expense payment review:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to load expense payment review."
      );
      setExpense(null);
    } finally {
      setIsLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    void loadReview();
  }, [loadReview]);

  useEffect(() => {
    if (!expenseId) return undefined;

    const channel = supabase
      .channel(`finance-expense-payment-review-${expenseId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expenses", filter: `id=eq.${expenseId}` },
        () => void loadReview()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payment_made_expense_allocations",
          filter: `expense_id=eq.${expenseId}`,
        },
        () => void loadReview()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${expenseId}`,
        },
        () => void loadReview()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadReview();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [expenseId, loadReview]);

  const runExpenseRpc = useCallback(
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
        await loadReview();
      } catch (error) {
        console.error(`Failed to run ${rpcName}:`, error);
        setPageError(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setIsRunningAction(false);
      }
    },
    [loadReview]
  );

  const approveExpense = useCallback(async () => {
    if (!expense) return;

    const amountInput = window.prompt(
      "Approved amount",
      String(expense.approved_amount || expense.requested_amount || expense.amount || "")
    );

    if (amountInput === null) return;

    const amount = Number(amountInput);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPageError("Approved amount must be greater than zero.");
      return;
    }

    const notes = window.prompt("Approval notes, optional", "") || null;

    await runExpenseRpc(
      "finance_approve_expense_to_spend",
      {
        p_expense_id: expense.id,
        p_approved_amount: amount,
        p_notes: notes,
      },
      "Expense approved to spend."
    );
  }, [expense, runExpenseRpc]);

  const rejectExpense = useCallback(async () => {
    if (!expense) return;

    const reason = window.prompt("Rejection reason");
    if (!reason?.trim()) return;

    await runExpenseRpc(
      "finance_reject_expense_before_spend",
      {
        p_expense_id: expense.id,
        p_reason: reason.trim(),
      },
      "Expense rejected."
    );
  }, [expense, runExpenseRpc]);

  const requestMoreInformation = useCallback(async () => {
    if (!expense) return;

    const message = window.prompt("What information or correction is needed?");
    if (!message?.trim()) return;

    await runExpenseRpc(
      "finance_request_expense_more_information",
      {
        p_expense_id: expense.id,
        p_message: message.trim(),
      },
      "More information requested."
    );
  }, [expense, runExpenseRpc]);

  const markExpenseMade = useCallback(async () => {
    if (!expense) return;

    const amountInput = window.prompt(
      "Final expense amount",
      String(expense.final_amount || expense.approved_amount || expense.requested_amount || expense.amount || "")
    );

    if (amountInput === null) return;

    const amount = Number(amountInput);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPageError("Final amount must be greater than zero.");
      return;
    }

    const notes = window.prompt("Notes, optional", "") || null;

    await runExpenseRpc(
      "finance_mark_expense_made",
      {
        p_expense_id: expense.id,
        p_final_amount: amount,
        p_notes: notes,
      },
      "Expense marked as made."
    );
  }, [expense, runExpenseRpc]);

  const verifyDocumentation = useCallback(async () => {
    if (!expense) return;

    const notes = window.prompt("Verification notes, optional", "") || null;

    await runExpenseRpc(
      "finance_verify_expense_documentation",
      {
        p_expense_id: expense.id,
        p_notes: notes,
      },
      "Expense documentation verified."
    );
  }, [expense, runExpenseRpc]);

  const markDocumentationIssue = useCallback(async () => {
    if (!expense) return;

    const issueNotes = window.prompt("Documentation issue notes");
    if (!issueNotes?.trim()) return;

    await runExpenseRpc(
      "finance_mark_expense_documentation_issue",
      {
        p_expense_id: expense.id,
        p_issue_notes: issueNotes.trim(),
      },
      "Documentation issue marked."
    );
  }, [expense, runExpenseRpc]);

  const confirmOnlineShopping = useCallback(
    async (status: "confirmed" | "issue_found" | "cancelled_refunded") => {
      if (!expense) return;

      const notes = window.prompt("Online shopping confirmation notes, optional", "") || null;

      await runExpenseRpc(
        "finance_confirm_expense_online_shopping",
        {
          p_expense_id: expense.id,
          p_confirmation_status: status,
          p_notes: notes,
        },
        "Online shopping record updated."
      );
    },
    [expense, runExpenseRpc]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-12 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
            <div className="mt-4 text-sm text-slate-400">Loading Finance review...</div>
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
              Expense request not found
            </div>
            <div className="mt-2 text-sm text-rose-100">
              {pageError || "The requested expense could not be loaded."}
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

  const isOnlineShopping = expense.expense_type === "online_shopping";

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

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
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Finance / Admin Review
                </div>

                <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Expense Request
                </div>

                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {expense.expense_number || "Expense Request"}
                </h1>

                <div className="mt-6 rounded-[30px] border border-cyan-400/20 bg-cyan-500/10 p-5 shadow-2xl shadow-cyan-950/10">
                  <div className="inline-flex w-fit items-center rounded-full border border-cyan-400/20 bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                    What Is This Request For?
                  </div>

                  <div className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.04em] text-white md:text-6xl">
                    {expense.title || "No expense title entered"}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                      {formatLabel(expense.expense_type)}
                    </span>

                    <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                      {expense.expense_source_name || "No source entered"}
                    </span>

                    <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                      {currencyCode} {formatMoney(expenseAmount)}
                    </span>
                  </div>

                  <div className="mt-4 max-w-5xl text-base font-medium leading-7 text-slate-200 md:text-lg md:leading-8">
                    {expense.description || "No description / reason entered for this expense request."}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge value={expense.request_status || expense.status} />
                  <StatusBadge value={expense.documentation_status} />
                  <StatusBadge value={expense.finance_review_status} />
                  <StatusBadge value={expense.coverage_status} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Expense Amount
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {currencyCode} {formatMoney(expenseAmount)}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Requested/final amount.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Covered
                  </div>
                  <div className="mt-2 text-xl font-semibold text-emerald-100">
                    {currencyCode} {formatMoney(coveredAmount)}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Confirmed allocations.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Remaining
                  </div>
                  <div className="mt-2 text-xl font-semibold text-amber-100">
                    {currencyCode} {formatMoney(remainingAmount)}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Uncovered amount.
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
              title="Request Context"
              description="Finance/Admin review context, separated from the requester expense page."
              icon={Receipt}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <ValueBlock label="Expense Company" value={company?.name || "—"} />
                <ValueBlock label="Expense Made By" value={expenseMadeByLabel} />
                <ValueBlock label="Expense Type" value={formatLabel(expense.expense_type)} />
                <ValueBlock label="Expense Source" value={expense.expense_source_name || "—"} />
                <ValueBlock label="Expense Date" value={formatDate(expense.expense_date)} />
                <ValueBlock label="Created" value={formatDateTime(expense.created_at)} />
                <ValueBlock
                  label="Retroactive"
                  value={expense.is_retroactive ? "Yes" : "No"}
                  detail={expense.retroactive_reason || undefined}
                />
                <ValueBlock label="Internal Notes" value={expense.notes || "—"} />
              </div>
            </SectionCard>

            <SectionCard
              title="Documentation Review"
              description="Files and links submitted for Finance verification."
              icon={FileCheck2}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <ValueBlock
                  label="Documentation Status"
                  value={<StatusBadge value={expense.documentation_status} />}
                />
                <ValueBlock
                  label="Documentation Link"
                  value={
                    documentationLink ? (
                      <span className="break-all text-cyan-200">{documentationLink}</span>
                    ) : (
                      "—"
                    )
                  }
                />
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

            {isOnlineShopping ? (
              <SectionCard
                title="Online Shopping Confirmation"
                description="Finance/Admin confirms online order records here."
                icon={ShoppingCart}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <ValueBlock label="Online Platform" value={expense.online_platform || "—"} />
                  <ValueBlock label="Order Number" value={expense.online_order_number || "—"} />
                  <ValueBlock label="Order Date" value={formatDate(expense.online_order_date)} />
                  <ValueBlock label="Tracking Number" value={expense.online_tracking_number || "—"} />
                  <ValueBlock
                    label="Order URL"
                    value={
                      expense.online_order_url ? (
                        <span className="break-all text-cyan-200">{expense.online_order_url}</span>
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
              title="Payment Coverage"
              description="Shows if this request is already covered by Payment Made allocations."
              icon={WalletCards}
            >
              {allocations.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <WalletCards className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    No payment allocations yet
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    After Finance creates Payment Made, allocation lines will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
                  <table className="w-full min-w-[900px] border-collapse">
                    <thead className="border-b border-white/10 bg-black/30">
                      <tr>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Payment Made
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
                      {allocations.map((allocation) => (
                        <tr
                          key={allocation.id}
                          className="border-b border-white/5 text-sm text-slate-300"
                        >
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/finance/transactions/expenses-payments-made/${allocation.payment_made_id}`
                                )
                              }
                              className="font-semibold text-cyan-200 transition hover:text-cyan-100"
                            >
                              Open Payment Made
                            </button>
                            <div className="mt-1 text-xs text-slate-500">
                              {formatDateTime(allocation.created_at)}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-white">
                            {allocation.currency_code || currencyCode}{" "}
                            {formatMoney(allocation.converted_amount || allocation.allocated_amount)}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge value={allocation.recipient_confirmation_status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>

          <aside className="sticky top-6 grid gap-6">
            <SectionCard
              title="Finance Actions"
              description="Approve, reject, verify, and move this request through the Finance flow."
              icon={ShieldCheck}
            >
              <div className="grid gap-3">
                <ActionButton
                  label="Approve To Spend"
                  icon={CheckCircle2}
                  tone="emerald"
                  disabled={isRunningAction}
                  onClick={() => void approveExpense()}
                />

                <ActionButton
                  label="Request More Info"
                  icon={AlertTriangle}
                  tone="amber"
                  disabled={isRunningAction}
                  onClick={() => void requestMoreInformation()}
                />

                <ActionButton
                  label="Reject"
                  icon={XCircle}
                  tone="rose"
                  disabled={isRunningAction}
                  onClick={() => void rejectExpense()}
                />

                <ActionButton
                  label="Mark Expense Made"
                  icon={PackageCheck}
                  tone="violet"
                  disabled={isRunningAction}
                  onClick={() => void markExpenseMade()}
                />

                <ActionButton
                  label="Verify Documentation"
                  icon={FileCheck2}
                  tone="emerald"
                  disabled={isRunningAction}
                  onClick={() => void verifyDocumentation()}
                />

                <ActionButton
                  label="Documentation Issue"
                  icon={AlertTriangle}
                  tone="amber"
                  disabled={isRunningAction}
                  onClick={() => void markDocumentationIssue()}
                />

                {isOnlineShopping ? (
                  <>
                    <ActionButton
                      label="Online Confirmed"
                      icon={ShoppingCart}
                      tone="cyan"
                      disabled={isRunningAction}
                      onClick={() => void confirmOnlineShopping("confirmed")}
                    />

                    <ActionButton
                      label="Online Issue"
                      icon={AlertTriangle}
                      tone="rose"
                      disabled={isRunningAction}
                      onClick={() => void confirmOnlineShopping("issue_found")}
                    />
                  </>
                ) : null}

                <ActionButton
                  label="Create Payment"
                  icon={WalletCards}
                  tone="cyan"
                  disabled={isRunningAction}
                  onClick={() =>
                    navigate(
                      `/finance/transactions/expenses-payments-made/new?source=expense&expenseId=${expense.id}`
                    )
                  }
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Workflow Status"
              description="Current system state for this request."
              icon={Clock3}
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
                  label="Recipient"
                  value={<StatusBadge value={expense.recipient_confirmation_status} />}
                />
              </div>
            </SectionCard>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => void loadReview()}
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
