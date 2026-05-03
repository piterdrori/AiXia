import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Download,
  ExternalLink,
  FileSignature,
  LinkIcon,
  RotateCcw,
  Send,
  ShieldCheck,
  UploadCloud,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type ReviewDecision = "approve" | "reject" | "needs_correction";
type ConfirmationDecision = "received_confirmed" | "not_received" | "disputed";

type EmployeeRefRow = {
  id: string;
  user_id: string;
  code: string;
  status: string;
  mark: string | null;
  metadata: Record<string, unknown> | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
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

type PayrollRunRow = {
  id: string;
  run_number: string | null;
  status: string;
  total_net: number | string | null;
};

type PaycheckRow = {
  id: string;
  paycheck_number: string | null;
  payment_status: string;
  gross_pay: number | string | null;
  bonus_total: number | string | null;
  deduction_total: number | string | null;
  reimbursement_total: number | string | null;
  net_pay: number | string | null;
  paid_at: string | null;
};

type PayrollPaymentRow = {
  id: string;
  payment_number: string | null;
  status: string;
  amount: number | string | null;
  payment_date: string | null;
  reference_number: string | null;
  notes: string | null;
  paycheck_currency_code: string | null;
  payment_currency_code: string | null;
  paycheck_amount: number | string | null;
  payment_amount: number | string | null;
  conversion_rate: number | string | null;
  conversion_date: string | null;
  conversion_source: string | null;
};

type PaycheckRequestRow = {
  id: string;
  request_number: string | null;
  employee_ref_id: string;
  employee_user_id: string;
  pay_profile_id: string | null;
  company_id: string | null;
  requested_bank_account_id: string | null;
  period_start: string;
  period_end: string;
  requested_pay_date: string | null;
  requested_currency_code: string;
  requested_gross_amount: number | string | null;
  requested_bonus_amount: number | string | null;
  requested_deduction_amount: number | string | null;
  requested_reimbursement_amount: number | string | null;
  requested_net_amount: number | string | null;
  status: string;
  review_status: string;
  documentation_status: string;
  signed_form_status: string;
  recipient_confirmation_status: string;
  signed_form_file_upload_id: string | null;
  signed_form_storage_bucket: string | null;
  signed_form_storage_path: string | null;
  signed_form_external_url: string | null;
  signed_form_uploaded_at: string | null;
  signed_form_submitted_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  correction_notes: string | null;
  rejected_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  linked_payroll_run_id: string | null;
  linked_paycheck_id: string | null;
  linked_payment_id: string | null;
  payment_sent_at: string | null;
  payment_confirmed_at: string | null;
  payment_disputed_at: string | null;
  confirmation_notes: string | null;
  archived_at: string | null;
  archived_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  reference_number: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  employee_ref?: EmployeeRefRow | null;
  profile?: ProfileRow | null;
  pay_profile?: PayProfileRow | null;
  payroll_run?: PayrollRunRow | null;
  paycheck?: PaycheckRow | null;
  payment?: PayrollPaymentRow | null;
};

const BUCKET_NAME = "finance-paycheck-forms";

const statusToneMap: Record<string, string> = {
  draft: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  submitted: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  pending_review: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  needs_correction: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  approved_for_payroll: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  approved: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  rejected: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  linked_to_payroll: "border-violet-400/20 bg-violet-500/10 text-violet-200",
  payment_sent: "border-blue-400/20 bg-blue-500/10 text-blue-200",
  received_confirmed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  disputed: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  closed: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  archived: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  deleted: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  missing: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  uploaded: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  linked: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  files_and_links: "border-violet-400/20 bg-violet-500/10 text-violet-200",
  not_uploaded: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  not_submitted: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  not_paid_yet: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  not_received: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  confirmed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  pending: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  scheduled: "border-blue-400/20 bg-blue-500/10 text-blue-200",
  paid: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  failed: "border-rose-400/20 bg-rose-500/10 text-rose-200",
};

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
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
}

function inputClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function textareaClass() {
  return "min-h-[132px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function sanitizePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80);
}

function getEmployeeLabel(request: PaycheckRequestRow | null) {
  if (!request) return "Employee";

  const profileName =
    request.profile?.full_name?.trim() || request.profile?.display_name?.trim();

  if (profileName) return profileName;
  if (request.employee_ref?.code) return `Employee ${request.employee_ref.code}`;
  return "Employee";
}

function getEmployeeSubLabel(request: PaycheckRequestRow | null) {
  if (!request) return "Employee registry";

  return [
    request.employee_ref?.code ? `Code ${request.employee_ref.code}` : null,
    request.employee_ref?.mark ? formatLabel(request.employee_ref.mark) : null,
    request.pay_profile?.pay_type ? formatLabel(request.pay_profile.pay_type) : null,
    request.pay_profile?.payment_frequency
      ? formatLabel(request.pay_profile.payment_frequency)
      : null,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getRequestPeriodLabel(request: PaycheckRequestRow | null) {
  if (!request) return "—";
  return `${formatDate(request.period_start)} → ${formatDate(request.period_end)}`;
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  const status = value || "—";
  const tone =
    statusToneMap[status] ?? "border-white/10 bg-white/[0.06] text-slate-300";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${tone}`}
    >
      {formatLabel(status)}
    </span>
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
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
      {detail ? <div className="mt-2 text-xs leading-5 text-slate-500">{detail}</div> : null}
    </div>
  );
}

function AmountCard({
  label,
  value,
  currency,
  tone,
}: {
  label: string;
  value: number | string | null | undefined;
  currency: string;
  tone: "cyan" | "emerald" | "amber" | "rose";
}) {
  const toneClasses = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  }[tone];

  return (
    <div className={`rounded-[24px] border p-4 ${toneClasses}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">
        {currency} {formatMoney(value)}
      </div>
    </div>
  );
}

export default function PaycheckRequestDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [request, setRequest] = useState<PaycheckRequestRow | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [signedFormUrl, setSignedFormUrl] = useState<string | null>(null);

  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replacementLink, setReplacementLink] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [confirmationNotes, setConfirmationNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const isEmployeeOwner = Boolean(
    currentUserId && request?.employee_user_id === currentUserId
  );

  const canEmployeeSubmit = Boolean(
    request &&
      isEmployeeOwner &&
      (request.status === "draft" || request.status === "needs_correction")
  );

  const canFinanceReview = Boolean(
    request &&
      ["submitted", "needs_correction"].includes(request.status) &&
      request.review_status !== "approved"
  );

  const canEmployeeConfirmPayment = Boolean(
    request &&
      isEmployeeOwner &&
      (request.status === "payment_sent" || request.status === "disputed")
  );

  const requestCurrency = request?.requested_currency_code || "USD";

  const loadRequest = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setActionError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id || null);

      const result = await supabase
        .from("finance_paycheck_requests")
        .select(
          [
            "id",
            "request_number",
            "employee_ref_id",
            "employee_user_id",
            "pay_profile_id",
            "company_id",
            "requested_bank_account_id",
            "period_start",
            "period_end",
            "requested_pay_date",
            "requested_currency_code",
            "requested_gross_amount",
            "requested_bonus_amount",
            "requested_deduction_amount",
            "requested_reimbursement_amount",
            "requested_net_amount",
            "status",
            "review_status",
            "documentation_status",
            "signed_form_status",
            "recipient_confirmation_status",
            "signed_form_file_upload_id",
            "signed_form_storage_bucket",
            "signed_form_storage_path",
            "signed_form_external_url",
            "signed_form_uploaded_at",
            "signed_form_submitted_at",
            "submitted_at",
            "reviewed_at",
            "reviewed_by",
            "review_notes",
            "correction_notes",
            "rejected_reason",
            "approved_at",
            "approved_by",
            "linked_payroll_run_id",
            "linked_paycheck_id",
            "linked_payment_id",
            "payment_sent_at",
            "payment_confirmed_at",
            "payment_disputed_at",
            "confirmation_notes",
            "archived_at",
            "archived_by",
            "deleted_at",
            "deleted_by",
            "notes",
            "metadata",
            "reference_number",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "employee_ref:finance_employee_refs!finance_paycheck_requests_employee_ref_id_fkey(id, user_id, code, status, mark, metadata)",
            "profile:profiles!finance_paycheck_requests_employee_user_id_fkey(user_id, full_name, display_name)",
            "pay_profile:finance_pay_profiles!finance_paycheck_requests_pay_profile_id_fkey(id, profile_number, user_id, pay_type, payment_frequency, base_salary, hourly_rate, default_hours, currency_code, active, status, effective_from, effective_to, notes, metadata)",
            "payroll_run:finance_payroll_runs!finance_paycheck_requests_linked_payroll_run_id_fkey(id, run_number, status, total_net)",
            "paycheck:finance_paychecks!finance_paycheck_requests_linked_paycheck_id_fkey(id, paycheck_number, payment_status, gross_pay, bonus_total, deduction_total, reimbursement_total, net_pay, paid_at)",
            "payment:finance_payroll_payments!finance_paycheck_requests_linked_payment_id_fkey(id, payment_number, status, amount, payment_date, reference_number, notes, paycheck_currency_code, payment_currency_code, paycheck_amount, payment_amount, conversion_rate, conversion_date, conversion_source)",
          ].join(", ")
        )
        .eq("id", id)
        .single();

      if (result.error) throw result.error;

      const loadedRequest = result.data as unknown as PaycheckRequestRow;
      setRequest(loadedRequest);
      setReplacementLink(loadedRequest.signed_form_external_url || "");
      setReviewNotes(loadedRequest.review_notes || "");
      setConfirmationNotes(loadedRequest.confirmation_notes || "");

      if (loadedRequest.signed_form_storage_path) {
        const bucket = loadedRequest.signed_form_storage_bucket || BUCKET_NAME;
        const signedResult = await supabase.storage
          .from(bucket)
          .createSignedUrl(loadedRequest.signed_form_storage_path, 3600);

        if (!signedResult.error) {
          setSignedFormUrl(signedResult.data.signedUrl);
        } else {
          setSignedFormUrl(null);
        }
      } else {
        setSignedFormUrl(null);
      }
    } catch (error) {
      console.error("Failed to load paycheck request:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to load paycheck request."
      );
      setRequest(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadRequest();
  }, [loadRequest]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`finance-paycheck-request-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_requests",
          filter: `id=eq.${id}`,
        },
        () => void loadRequest()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_payments" },
        () => void loadRequest()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paychecks" },
        () => void loadRequest()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadRequest();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [id, loadRequest]);

  const uploadReplacementForm = useCallback(async () => {
    if (!request) throw new Error("Request is not loaded.");

    if (!replacementFile) {
      return {
        bucket: request.signed_form_storage_bucket,
        path: request.signed_form_storage_path,
        uploadedAt: request.signed_form_uploaded_at,
      };
    }

    const extension = replacementFile.name.split(".").pop() || "file";
    const safeCode = sanitizePathPart(request.employee_ref?.code || "employee");
    const safeName = sanitizePathPart(replacementFile.name.replace(/\.[^.]+$/, ""));
    const path = `${safeCode}/${request.id}/${Date.now()}-${safeName}.${extension}`;

    const uploadResult = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, replacementFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadResult.error) throw uploadResult.error;

    return {
      bucket: BUCKET_NAME,
      path,
      uploadedAt: new Date().toISOString(),
    };
  }, [replacementFile, request]);

  const updateSignedFormAndMaybeSubmit = useCallback(async () => {
    if (!request || !currentUserId) {
      throw new Error("Missing request or user context.");
    }

    const uploadInfo = await uploadReplacementForm();

    const hasFile = Boolean(uploadInfo.path);
    const hasLink = Boolean(replacementLink.trim());

    if (!hasFile && !hasLink) {
      throw new Error("Signed form upload or signed form link is required.");
    }

    const documentationStatus =
      hasFile && hasLink ? "files_and_links" : hasFile ? "uploaded" : "linked";

    const updateResult = await supabase
      .from("finance_paycheck_requests")
      .update({
        documentation_status: documentationStatus,
        signed_form_status: "uploaded",
        signed_form_storage_bucket: uploadInfo.bucket,
        signed_form_storage_path: uploadInfo.path,
        signed_form_external_url: replacementLink.trim() || null,
        signed_form_uploaded_at: uploadInfo.uploadedAt,
        updated_by: currentUserId,
      })
      .eq("id", request.id);

    if (updateResult.error) throw updateResult.error;

    const submitResult = await supabase.rpc("finance_submit_paycheck_request", {
      p_request_id: request.id,
      p_actor_user_id: currentUserId,
    });

    if (submitResult.error) throw submitResult.error;
  }, [currentUserId, replacementLink, request, uploadReplacementForm]);

  const handleSubmitRequest = useCallback(async () => {
    setIsWorking(true);
    setActionError(null);
    setActionMessage(null);

    try {
      await updateSignedFormAndMaybeSubmit();
      setActionMessage("Paycheck request submitted to Finance review.");
      setReplacementFile(null);
      await loadRequest();
    } catch (error) {
      console.error("Failed to submit paycheck request:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to submit paycheck request."
      );
    } finally {
      setIsWorking(false);
    }
  }, [loadRequest, updateSignedFormAndMaybeSubmit]);

  const handleReview = useCallback(
    async (decision: ReviewDecision) => {
      if (!request || !currentUserId) return;

      setIsWorking(true);
      setActionError(null);
      setActionMessage(null);

      try {
        const result = await supabase.rpc("finance_review_paycheck_request", {
          p_request_id: request.id,
          p_actor_user_id: currentUserId,
          p_decision: decision,
          p_review_notes: reviewNotes.trim() || null,
        });

        if (result.error) throw result.error;

        setActionMessage(
          decision === "approve"
            ? "Paycheck request approved for payroll."
            : decision === "reject"
              ? "Paycheck request rejected."
              : "Correction requested from employee."
        );

        await loadRequest();
      } catch (error) {
        console.error("Failed to review paycheck request:", error);
        setActionError(
          error instanceof Error ? error.message : "Failed to review paycheck request."
        );
      } finally {
        setIsWorking(false);
      }
    },
    [currentUserId, loadRequest, request, reviewNotes]
  );

  const handleConfirmation = useCallback(
    async (decision: ConfirmationDecision) => {
      if (!request || !currentUserId) return;

      setIsWorking(true);
      setActionError(null);
      setActionMessage(null);

      try {
        const result = await supabase.rpc(
          "finance_confirm_paycheck_request_payment",
          {
            p_request_id: request.id,
            p_actor_user_id: currentUserId,
            p_confirmation_status: decision,
            p_confirmation_notes: confirmationNotes.trim() || null,
          }
        );

        if (result.error) throw result.error;

        setActionMessage(
          decision === "received_confirmed"
            ? "Payment received confirmation saved."
            : "Payment confirmation issue reported."
        );

        await loadRequest();
      } catch (error) {
        console.error("Failed to confirm paycheck payment:", error);
        setActionError(
          error instanceof Error
            ? error.message
            : "Failed to confirm paycheck payment."
        );
      } finally {
        setIsWorking(false);
      }
    },
    [confirmationNotes, currentUserId, loadRequest, request]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-6">
            <div className="text-sm text-slate-400">Loading paycheck request...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-6">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/paycheck-requests")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Paycheck Requests
            </button>

            <div className="text-sm text-rose-200">
              {actionError || "Paycheck request not found."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const paymentCurrency =
    request.payment?.payment_currency_code ||
    request.payment?.paycheck_currency_code ||
    requestCurrency;

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
                  Paycheck Request Detail
                </div>

                <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {request.request_number || request.reference_number || "Draft Request"}
                </div>

                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {getEmployeeLabel(request)}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  {getEmployeeSubLabel(request)} • {getRequestPeriodLabel(request)}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge value={request.status} />
                  <StatusBadge value={request.review_status} />
                  <StatusBadge value={request.signed_form_status} />
                  <StatusBadge value={request.recipient_confirmation_status} />
                </div>
              </div>

              <div className="grid gap-3">
                <ValueBlock
                  label="Requested Net"
                  value={`${requestCurrency} ${formatMoney(request.requested_net_amount)}`}
                  detail="Employee paycheck amount requested."
                />
                <ValueBlock
                  label="Payment Status"
                  value={<StatusBadge value={request.paycheck?.payment_status || request.status} />}
                  detail={`Payment sent: ${formatDateTime(request.payment_sent_at)}`}
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
              title="Request Overview"
              description="Employee, pay profile, period, and current workflow state."
              icon={UserRound}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ValueBlock
                  label="Employee"
                  value={getEmployeeLabel(request)}
                  detail={getEmployeeSubLabel(request)}
                />
                <ValueBlock
                  label="Period"
                  value={getRequestPeriodLabel(request)}
                  detail={`Requested pay date: ${formatDate(request.requested_pay_date)}`}
                />
                <ValueBlock
                  label="Pay Profile"
                  value={
                    request.pay_profile
                      ? `${formatLabel(request.pay_profile.pay_type)} • ${formatLabel(
                          request.pay_profile.payment_frequency
                        )}`
                      : "—"
                  }
                  detail={request.pay_profile?.profile_number || "No pay profile linked"}
                />
                <ValueBlock label="Status" value={<StatusBadge value={request.status} />} />
                <ValueBlock
                  label="Review"
                  value={<StatusBadge value={request.review_status} />}
                  detail={request.review_notes || request.correction_notes || request.rejected_reason}
                />
                <ValueBlock
                  label="Signed Form"
                  value={<StatusBadge value={request.signed_form_status} />}
                  detail={`Submitted: ${formatDateTime(request.signed_form_submitted_at)}`}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Paycheck Amounts"
              description="Requested salary, bonus, reimbursement, deduction, and calculated net amount."
              icon={WalletCards}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <AmountCard
                  label="Gross"
                  value={request.requested_gross_amount}
                  currency={requestCurrency}
                  tone="cyan"
                />
                <AmountCard
                  label="Bonus"
                  value={request.requested_bonus_amount}
                  currency={requestCurrency}
                  tone="emerald"
                />
                <AmountCard
                  label="Reimbursement"
                  value={request.requested_reimbursement_amount}
                  currency={requestCurrency}
                  tone="amber"
                />
                <AmountCard
                  label="Deduction"
                  value={request.requested_deduction_amount}
                  currency={requestCurrency}
                  tone="rose"
                />
                <AmountCard
                  label="Net"
                  value={request.requested_net_amount}
                  currency={requestCurrency}
                  tone="cyan"
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Signed Form"
              description="Uploaded signed form or external signed-form link used for Finance review."
              icon={UploadCloud}
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="grid gap-4">
                  <div className="grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-semibold text-white">
                      Current Form
                    </div>

                    {signedFormUrl ? (
                      <a
                        href={signedFormUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-fit items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                      >
                        <Download className="h-4 w-4" />
                        Open Uploaded Form
                      </a>
                    ) : null}

                    {request.signed_form_external_url ? (
                      <a
                        href={request.signed_form_external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-fit items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open External Link
                      </a>
                    ) : null}

                    {!signedFormUrl && !request.signed_form_external_url ? (
                      <div className="text-sm text-slate-500">
                        No signed form is attached yet.
                      </div>
                    ) : null}
                  </div>

                  {canEmployeeSubmit ? (
                    <>
                      <label className="grid gap-2">
                        <span className={labelClass()}>Upload Corrected / Signed Form</span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                          onChange={(event) =>
                            setReplacementFile(event.target.files?.[0] || null)
                          }
                          className="block w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-100 hover:file:bg-cyan-500/15"
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className={labelClass()}>Signed Form Link</span>
                        <div className="relative">
                          <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                          <input
                            value={replacementLink}
                            onChange={(event) => setReplacementLink(event.target.value)}
                            placeholder="Paste signed form link if stored externally"
                            className={`${inputClass()} pl-11`}
                          />
                        </div>
                      </label>

                      <button
                        type="button"
                        onClick={() => void handleSubmitRequest()}
                        disabled={isWorking}
                        className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        Submit To Finance Review
                      </button>
                    </>
                  ) : null}
                </div>

                <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4">
                  <div className="text-sm font-semibold text-amber-100">
                    Signed form status
                  </div>
                  <div className="mt-3">
                    <StatusBadge value={request.signed_form_status} />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-amber-100/75">
                    Finance reviews only submitted signed forms. If correction is required,
                    the employee can upload a replacement and resubmit.
                  </p>
                </div>
              </div>
            </SectionCard>

                        <SectionCard
              title="Finance Review"
              description="Finance/Admin can approve, reject, or request correction after the signed form is submitted."
              icon={ShieldCheck}
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <label className="grid gap-2">
                  <span className={labelClass()}>Review Notes</span>
                  <textarea
                    value={reviewNotes}
                    onChange={(event) => setReviewNotes(event.target.value)}
                    placeholder="Write review notes, rejection reason, or correction instructions"
                    className={textareaClass()}
                  />
                </label>

                <div className="grid gap-3">
                  <ValueBlock
                    label="Current Review Status"
                    value={<StatusBadge value={request.review_status} />}
                    detail={request.review_notes || request.correction_notes || request.rejected_reason}
                  />

                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={() => void handleReview("approve")}
                      disabled={isWorking || !canFinanceReview}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <BadgeCheck className="h-4 w-4" />
                      Approve For Payroll
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleReview("needs_correction")}
                      disabled={isWorking || !canFinanceReview}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Request Correction
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleReview("reject")}
                      disabled={isWorking || !canFinanceReview}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Payroll / Paycheck Link"
              description="Approved requests are linked to payroll run, paycheck, and payment execution."
              icon={WalletCards}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ValueBlock
                  label="Payroll Run"
                  value={request.payroll_run?.run_number || "Not linked"}
                  detail={
                    request.payroll_run
                      ? `Status: ${formatLabel(request.payroll_run.status)}`
                      : "Finance links approved requests to a payroll run."
                  }
                />

                <ValueBlock
                  label="Paycheck"
                  value={request.paycheck?.paycheck_number || "Not created"}
                  detail={
                    request.paycheck
                      ? `Payment status: ${formatLabel(request.paycheck.payment_status)}`
                      : "Paycheck is created when linked to payroll."
                  }
                />

                <ValueBlock
                  label="Payment"
                  value={request.payment?.payment_number || "Not sent"}
                  detail={
                    request.payment
                      ? `Status: ${formatLabel(request.payment.status)} • Date: ${formatDate(
                          request.payment.payment_date
                        )}`
                      : "Payment appears after Finance sends the paycheck."
                  }
                />

                <ValueBlock
                  label="Paycheck Amount"
                  value={`${request.payment?.paycheck_currency_code || requestCurrency} ${formatMoney(
                    request.payment?.paycheck_amount || request.requested_net_amount
                  )}`}
                  detail="Amount counted against the paycheck balance."
                />

                <ValueBlock
                  label="Payment Amount"
                  value={`${paymentCurrency} ${formatMoney(
                    request.payment?.payment_amount || request.payment?.amount
                  )}`}
                  detail={
                    request.payment?.conversion_rate
                      ? `Rate ${request.payment.conversion_rate} on ${formatDate(
                          request.payment.conversion_date
                        )} via ${request.payment.conversion_source || "conversion API"}`
                      : "Conversion details appear when payment currency differs."
                  }
                />

                <ValueBlock
                  label="Recipient Confirmation"
                  value={<StatusBadge value={request.recipient_confirmation_status} />}
                  detail={request.confirmation_notes || "Employee confirms after payment is sent."}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Employee Payment Confirmation"
              description="After Finance sends the paycheck, the employee confirms whether the money was received."
              icon={BadgeCheck}
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <label className="grid gap-2">
                  <span className={labelClass()}>Confirmation Notes</span>
                  <textarea
                    value={confirmationNotes}
                    onChange={(event) => setConfirmationNotes(event.target.value)}
                    placeholder="Optional note: received, not received, payment issue, or dispute details"
                    className={textareaClass()}
                  />
                </label>

                <div className="grid gap-3">
                  <ValueBlock
                    label="Current Confirmation"
                    value={<StatusBadge value={request.recipient_confirmation_status} />}
                    detail={`Payment sent: ${formatDateTime(request.payment_sent_at)}`}
                  />

                  <button
                    type="button"
                    onClick={() => void handleConfirmation("received_confirmed")}
                    disabled={isWorking || !canEmployeeConfirmPayment}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    Confirm Received
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleConfirmation("not_received")}
                    disabled={isWorking || !canEmployeeConfirmPayment}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Not Received
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleConfirmation("disputed")}
                    disabled={isWorking || !canEmployeeConfirmPayment}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Dispute Payment
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>

          <aside className="sticky top-6 grid gap-6 self-start">
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Workflow Status
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Request, form, review, payroll, payment, and confirmation state.
                </p>
              </div>

              <div className="grid gap-4 p-5">
                <ValueBlock
                  label="Request Status"
                  value={<StatusBadge value={request.status} />}
                  detail={`Updated: ${formatDateTime(request.updated_at)}`}
                />

                <ValueBlock
                  label="Review Status"
                  value={<StatusBadge value={request.review_status} />}
                  detail={`Reviewed: ${formatDateTime(request.reviewed_at)}`}
                />

                <ValueBlock
                  label="Signed Form"
                  value={<StatusBadge value={request.signed_form_status} />}
                  detail={`Uploaded: ${formatDateTime(request.signed_form_uploaded_at)}`}
                />

                <ValueBlock
                  label="Documentation"
                  value={<StatusBadge value={request.documentation_status} />}
                  detail={request.signed_form_storage_path || request.signed_form_external_url || "No form attached"}
                />

                <ValueBlock
                  label="Payroll Link"
                  value={request.linked_payroll_run_id ? "Linked" : "Not Linked"}
                  detail={request.payroll_run?.run_number || "Waiting for Finance/Admin payroll run"}
                />

                <ValueBlock
                  label="Payment"
                  value={<StatusBadge value={request.payment?.status || request.paycheck?.payment_status || "pending"} />}
                  detail={request.payment?.payment_number || "No payment recorded yet"}
                />

                <ValueBlock
                  label="Confirmation"
                  value={<StatusBadge value={request.recipient_confirmation_status} />}
                  detail={request.confirmation_notes || "Waiting for employee confirmation after payment sent"}
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Timeline
                </div>
              </div>

              <div className="grid gap-3 p-5">
                <ValueBlock
                  label="Created"
                  value={formatDateTime(request.created_at)}
                  detail={request.request_number || request.reference_number || "Draft request"}
                />
                <ValueBlock
                  label="Submitted"
                  value={formatDateTime(request.submitted_at)}
                  detail="Employee submitted signed form for review."
                />
                <ValueBlock
                  label="Approved"
                  value={formatDateTime(request.approved_at)}
                  detail="Finance approved for payroll."
                />
                <ValueBlock
                  label="Payment Sent"
                  value={formatDateTime(request.payment_sent_at)}
                  detail="Finance sent paycheck payment."
                />
                <ValueBlock
                  label="Confirmed"
                  value={formatDateTime(request.payment_confirmed_at)}
                  detail="Employee confirmed payment received."
                />
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
