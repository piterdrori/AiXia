import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  Edit3,
  FileCheck2,
  FileText,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  WalletCards,
  X,
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

type CurrencyRow = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  status: string;
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

type EditFormState = {
  fundingCompanyId: string;
  fundingBankAccountId: string;
  fundingPeriodFrom: string;
  fundingPeriodTo: string;
  allocationDate: string;
  currencyCode: string;
  fundingPoolAmount: string;
  notes: string;
};

type RunningAction =
  | "save_edit"
  | "confirm_pool"
  | "verify_proof"
  | "upload_proof"
  | "open_payment_tool";

const statusToneMap: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  draft: "slate",
  allocated: "emerald",
  confirmed: "emerald",
  cancelled: "rose",
  archived: "amber",
  deleted: "rose",
  missing: "rose",
  uploaded: "cyan",
  linked: "cyan",
  files_and_links: "cyan",
  verified: "emerald",
  issue_found: "rose",
};

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function normalizeCurrencyCode(value: string | null | undefined) {
  return (value || "").trim().toUpperCase();
}

function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
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

function inputClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function textareaClass() {
  return "min-h-[132px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
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
      <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
        {value}
      </div>
      <div className="mt-3 text-sm leading-6 text-slate-400">{subtitle}</div>
    </div>
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
  icon: LucideIcon;
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
  loadingLabel,
  icon: Icon,
  tone,
  disabled,
  isRunning,
  onClick,
}: {
  label: string;
  loadingLabel?: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
  disabled?: boolean;
  isRunning?: boolean;
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
      disabled={disabled || isRunning}
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      {isRunning ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : (
        <Icon className="h-4 w-4 shrink-0" />
      )}
      {isRunning ? loadingLabel || "Working..." : label}
    </button>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: string;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-2 text-xs leading-5 text-slate-500">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function FinanceExpenseFundingBatchDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const batchId = params.id;

  const [batch, setBatch] = useState<FundingBatchRow | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentWithFile[]>([]);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [fundingProofFile, setFundingProofFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [runningAction, setRunningAction] = useState<RunningAction | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((bank) => [bank.id, bank]));
  }, [bankAccounts]);

  const currencyOptions = useMemo(() => {
    return currencies.filter((currency) => currency.status === "active");
  }, [currencies]);

  const currencyCode = normalizeCurrencyCode(batch?.currency_code || "USD");
  const fundingPoolAmount = toNumber(batch?.allocated_amount);

  const fundingPeriodFrom = getMetadataString(batch?.metadata, "funding_period_from");
  const fundingPeriodTo = getMetadataString(batch?.metadata, "funding_period_to");
  const fundingPeriodLabel =
    fundingPeriodFrom && fundingPeriodTo
      ? `${formatDate(fundingPeriodFrom)} → ${formatDate(fundingPeriodTo)}`
      : "Not saved";

  const fundingCompany = batch ? companyMap.get(batch.funding_company_id) || null : null;
  const fundingBankAccount =
    batch?.funding_bank_account_id ? bankAccountMap.get(batch.funding_bank_account_id) || null : null;

  const isArchivedOrDeleted =
    batch?.status === "archived" || batch?.status === "deleted" || batch?.status === "cancelled";
  const isDraftPool = batch?.status === "draft";
  const isConfirmedPool = batch?.status === "allocated" || batch?.status === "confirmed";
  const canVerifyProof =
    attachments.length > 0 &&
    batch?.documentation_status !== "verified" &&
    !isArchivedOrDeleted;
  const canConfirmPool = isDraftPool && attachments.length > 0 && !isArchivedOrDeleted;
  const actionLocked = Boolean(runningAction);

  const availableEditBankAccounts = useMemo(() => {
    if (!editForm?.fundingCompanyId) return [];
    return bankAccounts.filter((bank) => bank.company_id === editForm.fundingCompanyId);
  }, [bankAccounts, editForm?.fundingCompanyId]);

  const buildEditForm = useCallback((nextBatch: FundingBatchRow): EditFormState => {
    return {
      fundingCompanyId: nextBatch.funding_company_id || "",
      fundingBankAccountId: nextBatch.funding_bank_account_id || "",
      fundingPeriodFrom: getMetadataString(nextBatch.metadata, "funding_period_from"),
      fundingPeriodTo: getMetadataString(nextBatch.metadata, "funding_period_to"),
      allocationDate: nextBatch.allocation_date || getTodayIsoDate(),
      currencyCode: normalizeCurrencyCode(nextBatch.currency_code || "USD"),
      fundingPoolAmount: String(toNumber(nextBatch.allocated_amount)),
      notes: nextBatch.notes || "",
    };
  }, []);

  const loadBatch = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (!batchId) {
        setPageError("Missing funding pool ID.");
        setIsLoading(false);
        return;
      }

      if (mode === "initial" && !hasLoadedOnce) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

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

        const loadedBatch = batchResult.data as unknown as FundingBatchRow;

        const [companiesResult, bankAccountsResult, currenciesResult, attachmentsResult] =
          await Promise.all([
            supabase.from("finance_companies").select("id, name").order("name"),

            supabase
              .from("finance_bank_accounts")
              .select(
                "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id, is_default"
              )
              .order("name"),

            supabase
              .from("finance_currencies")
              .select(
                "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status"
              )
              .eq("status", "active")
              .order("currency_code"),

            supabase
              .from("finance_record_attachments")
              .select(
                "id, entity_type, entity_id, file_upload_id, uploaded_by, notes, metadata, created_at"
              )
              .eq("entity_type", "finance_expense_funding_batch")
              .eq("entity_id", loadedBatch.id)
              .order("created_at", { ascending: false }),
          ]);

        if (companiesResult.error) throw companiesResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;
        if (currenciesResult.error) throw currenciesResult.error;
        if (attachmentsResult.error) throw attachmentsResult.error;

        setBatch(loadedBatch);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
        setCurrencies((currenciesResult.data || []) as unknown as CurrencyRow[]);

        if (!isEditing) {
          setEditForm(buildEditForm(loadedBatch));
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

        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load funding pool:", error);
        setPageError(error instanceof Error ? error.message : "Failed to load funding pool.");
        if (!hasLoadedOnce) setBatch(null);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [batchId, buildEditForm, hasLoadedOnce, isEditing]
  );

  useEffect(() => {
    void loadBatch("initial");
  }, [loadBatch]);

  useEffect(() => {
    if (!batchId) return undefined;

    const channel = supabase
      .channel(`finance-expense-funding-pool-detail-${batchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_expense_funding_batches",
          filter: `id=eq.${batchId}`,
        },
        () => void loadBatch("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${batchId}`,
        },
        () => void loadBatch("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadBatch("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [batchId, loadBatch]);

  const updateEditField = useCallback(
    <Key extends keyof EditFormState>(key: Key, value: EditFormState[Key]) => {
      setEditForm((current) => {
        if (!current) return current;

        const next = {
          ...current,
          [key]: value,
        };

        if (key === "fundingCompanyId") {
          const defaultBank =
            bankAccounts.find((bank) => bank.company_id === value && bank.is_default)?.id ||
            bankAccounts.find((bank) => bank.company_id === value)?.id ||
            "";

          next.fundingBankAccountId = defaultBank;
        }

        if (key === "currencyCode") {
          next.currencyCode = normalizeCurrencyCode(String(value));
        }

        return next;
      });

      setPageError(null);
      setPageMessage(null);
    },
    [bankAccounts]
  );

  const startEditing = useCallback(() => {
    if (!batch || isArchivedOrDeleted) return;

    setEditForm(buildEditForm(batch));
    setIsEditing(true);
    setPageError(null);
    setPageMessage(null);
  }, [batch, buildEditForm, isArchivedOrDeleted]);

    const saveEdit = useCallback(async () => {
    if (!batch || !editForm || runningAction) return;

    setRunningAction("save_edit");
    setPageError(null);
    setPageMessage(null);

    try {
      const nextAmount = toNumber(editForm.fundingPoolAmount);
      const nextCurrency = normalizeCurrencyCode(editForm.currencyCode);

      if (!editForm.fundingCompanyId) {
        setPageError("Funding company is required.");
        return;
      }

      if (!editForm.allocationDate) {
        setPageError("Allocation date is required.");
        return;
      }

      if (!editForm.fundingPeriodFrom) {
        setPageError("Funding period start date is required.");
        return;
      }

      if (!editForm.fundingPeriodTo) {
        setPageError("Funding period end date is required.");
        return;
      }

      if (editForm.fundingPeriodTo < editForm.fundingPeriodFrom) {
        setPageError("Funding period end date cannot be before the start date.");
        return;
      }

      if (!nextCurrency) {
        setPageError("Funding currency is required.");
        return;
      }

      if (nextAmount <= 0) {
        setPageError("Funding pool amount must be greater than zero.");
        return;
      }

      const selectedBank = editForm.fundingBankAccountId
        ? bankAccountMap.get(editForm.fundingBankAccountId)
        : null;

      if (selectedBank && selectedBank.company_id !== editForm.fundingCompanyId) {
        setPageError("Funding bank account must belong to the funding company.");
        return;
      }

      const nextMetadata = {
        ...(batch.metadata || {}),
        allocation_mode: "funding_pool_reserve",
        funding_pool_amount: nextAmount,
        funding_pool_currency: nextCurrency,
        funding_period_from: editForm.fundingPeriodFrom,
        funding_period_to: editForm.fundingPeriodTo,
        process_scope: "payment_execution_tools",
        expense_selection_allowed: false,
        expense_distribution_allowed: false,
        last_edited_from: "funding_pool_detail_page",
      };

      const updateResult = await supabase
        .from("finance_expense_funding_batches")
        .update({
          funding_company_id: editForm.fundingCompanyId,
          funding_bank_account_id: editForm.fundingBankAccountId || null,
          allocation_date: editForm.allocationDate,
          currency_code: nextCurrency,
          allocated_amount: nextAmount,
          notes: editForm.notes.trim() || null,
          metadata: nextMetadata,
        })
        .eq("id", batch.id);

      if (updateResult.error) throw updateResult.error;

      setPageMessage("Funding pool details updated.");
      setIsEditing(false);
      await loadBatch("silent");
    } catch (error) {
      console.error("Failed to update funding pool:", error);
      setPageError(error instanceof Error ? error.message : "Failed to update funding pool.");
    } finally {
      setRunningAction(null);
    }
  }, [bankAccountMap, batch, editForm, loadBatch, runningAction]);

  const runBatchRpc = useCallback(
    async (
      action: RunningAction,
      rpcName: string,
      args: Record<string, string | number | null>,
      successMessage: string
    ) => {
      if (runningAction) return;

      setRunningAction(action);
      setPageError(null);
      setPageMessage(null);

      try {
        const result = await supabase.rpc(rpcName, args);
        if (result.error) throw result.error;

        setPageMessage(successMessage);
        await loadBatch("silent");
      } catch (error) {
        console.error(`Failed to run ${rpcName}:`, error);
        setPageError(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setRunningAction(null);
      }
    },
    [loadBatch, runningAction]
  );

  const confirmFundingPool = useCallback(async () => {
    if (!batch || runningAction) return;

    if (attachments.length === 0) {
      setPageError("Funding proof is required before confirming the funding pool.");
      return;
    }

    await runBatchRpc(
      "confirm_pool",
      "finance_mark_expense_funding_batch_allocated",
      {
        p_batch_id: batch.id,
      },
      "Funding pool confirmed."
    );
  }, [attachments.length, batch, runBatchRpc, runningAction]);

  const verifyProof = useCallback(async () => {
    if (!batch || runningAction) return;

    await runBatchRpc(
      "verify_proof",
      "finance_mark_expense_funding_batch_documentation",
      {
        p_batch_id: batch.id,
        p_documentation_status: "verified",
        p_notes: "Funding pool documentation verified.",
      },
      "Funding pool documentation verified."
    );
  }, [batch, runBatchRpc, runningAction]);

  const uploadFundingProof = useCallback(async () => {
    if (!batch || !fundingProofFile || runningAction) return;

    setRunningAction("upload_proof");
    setPageError(null);
    setPageMessage(null);

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const userId = authResult.data.user?.id ?? null;
      const resolvedMimeType = resolveMimeType(fundingProofFile);
      const safeFileName = fundingProofFile.name.replace(/[^\w.\-]+/g, "_");
      const filePath = `${batch.id}/${Date.now()}-${safeFileName}`;

      const uploadResult = await supabase.storage
        .from("finance-expense-funding-batch-documents")
        .upload(filePath, fundingProofFile, {
          contentType: resolvedMimeType,
          upsert: false,
        });

      if (uploadResult.error) throw uploadResult.error;

      const fileUploadResult = await supabase
        .from("file_uploads")
        .insert({
          user_id: userId,
          file_name: fundingProofFile.name,
          file_path: uploadResult.data.path,
          file_size: fundingProofFile.size,
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
        notes: "Funding pool proof",
        metadata: {
          bucket: "finance-expense-funding-batch-documents",
          uploaded_from: "funding_pool_detail_page",
          resolved_mime_type: resolvedMimeType,
        },
      });

      if (attachmentResult.error) throw attachmentResult.error;

      const documentationResult = await supabase.rpc(
        "finance_mark_expense_funding_batch_documentation",
        {
          p_batch_id: batch.id,
          p_documentation_status: "uploaded",
          p_notes: "Funding pool proof uploaded.",
        }
      );

      if (documentationResult.error) throw documentationResult.error;

      setFundingProofFile(null);
      setPageMessage("Funding pool proof uploaded.");
      await loadBatch("silent");
    } catch (error) {
      console.error("Failed to upload funding pool proof:", error);
      setPageError(error instanceof Error ? error.message : "Failed to upload funding pool proof.");
    } finally {
      setRunningAction(null);
    }
  }, [batch, fundingProofFile, loadBatch, runningAction]);

  const openExpensePaymentsTool = useCallback(() => {
    if (!batch || runningAction) return;

    setRunningAction("open_payment_tool");
    navigate(`/finance/transactions/expenses-payments-made/new?source=batch&batchId=${batch.id}`);
  }, [batch, navigate, runningAction]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-12 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-200" />
            <div className="mt-4 text-sm text-slate-400">Loading funding pool...</div>
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
              Funding pool not found
            </div>
            <div className="mt-2 text-sm text-rose-100">
              {pageError || "The requested funding pool could not be loaded."}
            </div>
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/expenses-payments-made")}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Payment Control
            </button>
          </div>
        </div>
      </div>
    );
  }

  const editableForm = editForm || buildEditForm(batch);

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
              Payment Control
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Funding Pool Detail
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {batch.batch_number}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  This is a period-based Finance reserve only. Expense matching and money
                  distribution happen later in the separate Expense Payments tool.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge value={batch.status} />
                  <StatusBadge value={batch.documentation_status} />
                  {isRefreshing ? (
                    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                      Silent Refresh
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryBlock
                  title="Funding Pool"
                  value={`${currencyCode} ${formatMoney(fundingPoolAmount)}`}
                  subtitle="Total amount reserved by Finance."
                />
                <SummaryBlock
                  title="Funding Period"
                  value={fundingPeriodLabel}
                  subtitle="The operating-expense period this pool should cover."
                />
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
              title="Funding Pool Overview"
              description="Funding source, period, pool amount, and audit context."
              icon={Archive}
            >
              <div className="mb-5 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {isEditing ? "Editing funding pool" : "Funding pool details"}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    This page edits the funding pool only. It does not select or pay expenses.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {isEditing ? (
                    <>
                      <ActionButton
                        label="Save Changes"
                        loadingLabel="Saving..."
                        icon={Save}
                        tone="emerald"
                        disabled={actionLocked}
                        isRunning={runningAction === "save_edit"}
                        onClick={() => void saveEdit()}
                      />
                      <ActionButton
                        label="Cancel"
                        icon={X}
                        tone="slate"
                        disabled={actionLocked}
                        onClick={cancelEditing}
                      />
                    </>
                  ) : (
                    <ActionButton
                      label="Edit"
                      icon={Edit3}
                      tone="cyan"
                      disabled={actionLocked || isArchivedOrDeleted}
                      onClick={startEditing}
                    />
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="grid gap-2">
                    <span className={labelClass()}>Funding Company</span>
                    <select
                      value={editableForm.fundingCompanyId}
                      onChange={(event) =>
                        updateEditField("fundingCompanyId", event.target.value)
                      }
                      disabled={actionLocked}
                      className={inputClass()}
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
                    <span className={labelClass()}>Funding Bank Account</span>
                    <select
                      value={editableForm.fundingBankAccountId}
                      onChange={(event) =>
                        updateEditField("fundingBankAccountId", event.target.value)
                      }
                      disabled={!editableForm.fundingCompanyId || actionLocked}
                      className={inputClass()}
                    >
                      <option value="">No bank selected</option>
                      {availableEditBankAccounts.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {getBankLabel(bank)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Allocation Date</span>
                    <input
                      type="date"
                      value={editableForm.allocationDate}
                      onChange={(event) =>
                        updateEditField("allocationDate", event.target.value)
                      }
                      disabled={actionLocked}
                      className={inputClass()}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Funding Period From</span>
                    <input
                      type="date"
                      value={editableForm.fundingPeriodFrom}
                      onChange={(event) =>
                        updateEditField("fundingPeriodFrom", event.target.value)
                      }
                      disabled={actionLocked}
                      className={inputClass()}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Funding Period To</span>
                    <input
                      type="date"
                      value={editableForm.fundingPeriodTo}
                      onChange={(event) =>
                        updateEditField("fundingPeriodTo", event.target.value)
                      }
                      disabled={actionLocked}
                      className={inputClass()}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Funding Currency</span>
                    <select
                      value={editableForm.currencyCode}
                      onChange={(event) => updateEditField("currencyCode", event.target.value)}
                      disabled={actionLocked}
                      className={inputClass()}
                    >
                      <option value="">Select currency</option>
                      {currencyOptions.map((currency) => (
                        <option key={currency.id} value={currency.currency_code}>
                          {currency.currency_code} — {currency.currency_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Funding Pool Amount</span>
                    <input
                      value={editableForm.fundingPoolAmount}
                      onChange={(event) =>
                        updateEditField("fundingPoolAmount", event.target.value)
                      }
                      disabled={actionLocked}
                      inputMode="decimal"
                      placeholder="0.00"
                      className={inputClass()}
                    />
                    <span className="text-xs leading-5 text-slate-500">
                      Total amount reserved by Finance.
                    </span>
                  </label>

                  <div className="grid gap-2 md:col-span-2">
                    <span className={labelClass()}>Pool Meaning</span>
                    <div className="flex min-h-[44px] items-center rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100">
                      Reserve only — no expense selection and no money distribution on this page
                    </div>
                    <span className="text-xs leading-5 text-slate-500">
                      Expense matching and disbursement happen later from Expense Payments.
                    </span>
                  </div>

                  <label className="grid gap-2 md:col-span-3">
                    <span className={labelClass()}>Funding Notes</span>
                    <textarea
                      value={editableForm.notes}
                      onChange={(event) => updateEditField("notes", event.target.value)}
                      disabled={actionLocked}
                      className={textareaClass()}
                      placeholder="Internal funding pool notes"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <ValueBlock label="Batch Number" value={batch.batch_number} />
                  <ValueBlock
                    label="Funding Pool"
                    value={`${currencyCode} ${formatMoney(fundingPoolAmount)}`}
                    detail="Total amount reserved by Finance."
                  />
                  <ValueBlock label="Funding Period" value={fundingPeriodLabel} />
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
                  <ValueBlock
                    label="Pool Meaning"
                    value="Reserve only — no expense distribution"
                    detail="Expense matching and payment distribution happen later."
                  />
                  <ValueBlock
                    label="Confirmed By"
                    value={batch.allocated_by ? "Recorded" : "Not confirmed yet"}
                  />
                  <ValueBlock
                    label="Proof"
                    value={attachments.length > 0 ? "Attached" : "Not attached"}
                    detail="Proof is required before confirming the funding pool."
                  />
                  {batch.notes ? (
                    <div className="md:col-span-3">
                      <ValueBlock label="Notes" value={batch.notes} />
                    </div>
                  ) : null}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Funding Proof"
              description="Files uploaded as proof that this funding pool was approved, reserved, or transferred."
              icon={UploadCloud}
            >
              {attachments.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <FileText className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    No funding proof uploaded
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">
                    Upload bank confirmation, internal approval, funding report, or reserve
                    document.
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
              title="Funding Pool Actions"
              description="Confirm the pool, verify proof, or open the separate payment distribution tool."
              icon={ShieldCheck}
            >
              <div className="grid gap-3">
                {isArchivedOrDeleted ? (
                  <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
                    This funding pool is archived, deleted, or cancelled. Normal actions are hidden.
                  </div>
                ) : null}

                {isDraftPool ? (
                  <ActionButton
                    label="Confirm Funding Pool"
                    loadingLabel="Confirming..."
                    icon={CheckCircle2}
                    tone="emerald"
                    disabled={actionLocked || !canConfirmPool}
                    isRunning={runningAction === "confirm_pool"}
                    onClick={() => void confirmFundingPool()}
                  />
                ) : null}

                {!isDraftPool && isConfirmedPool ? (
                  <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
                    This funding pool is confirmed. It can now be used by the separate Expense
                    Payments tool to distribute money across verified expenses.
                  </div>
                ) : null}

                {canVerifyProof ? (
                  <ActionButton
                    label="Verify Proof"
                    loadingLabel="Verifying..."
                    icon={FileCheck2}
                    tone="violet"
                    disabled={actionLocked}
                    isRunning={runningAction === "verify_proof"}
                    onClick={() => void verifyProof()}
                  />
                ) : null}

                {isConfirmedPool && !isArchivedOrDeleted ? (
                  <ActionButton
                    label="Open Expense Payments Tool"
                    loadingLabel="Opening..."
                    icon={WalletCards}
                    tone="cyan"
                    disabled={actionLocked}
                    isRunning={runningAction === "open_payment_tool"}
                    onClick={openExpensePaymentsTool}
                  />
                ) : null}

                {!isArchivedOrDeleted && isDraftPool && attachments.length === 0 ? (
                  <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100">
                    Upload funding proof before confirming this funding pool.
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title="Upload Funding Proof"
              description="Attach proof for this funding pool."
              icon={UploadCloud}
            >
              <div className="rounded-[24px] border border-dashed border-white/15 bg-black/20 p-4">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                  disabled={actionLocked || isArchivedOrDeleted}
                  onChange={(event) => setFundingProofFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-violet-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                />

                {fundingProofFile ? (
                  <div className="mt-3 rounded-2xl border border-violet-400/15 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
                    {fundingProofFile.name}
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={actionLocked || !fundingProofFile || isArchivedOrDeleted}
                  onClick={() => void uploadFundingProof()}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {runningAction === "upload_proof" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4" />
                  )}
                  {runningAction === "upload_proof" ? "Uploading Proof..." : "Upload Proof"}
                </button>
              </div>
            </SectionCard>

            <SectionCard
              title="Status Summary"
              description="Current funding pool state."
              icon={Clock3}
            >
              <div className="grid gap-3">
                <ValueBlock label="Pool Status" value={<StatusBadge value={batch.status} />} />
                <ValueBlock
                  label="Documentation"
                  value={<StatusBadge value={batch.documentation_status} />}
                />
                <ValueBlock
                  label="Funding Pool"
                  value={`${currencyCode} ${formatMoney(fundingPoolAmount)}`}
                  detail="Period-based money reserve."
                />
                <ValueBlock
                  label="Funding Period"
                  value={fundingPeriodLabel}
                  detail="Stored in metadata."
                />
              </div>
            </SectionCard>

            <InfoCard icon={Coins} title="Funding Pool">
              This record reserves a period-based money pool from one company and optional bank
              account.
            </InfoCard>

            <InfoCard icon={WalletCards} title="Expense Payments">
              Actual distribution across verified expenses happens only on the Expense Payments
              page.
            </InfoCard>

            <InfoCard icon={Building2} title="No Expense Selection">
              This page does not select, match, or distribute money to individual expenses.
            </InfoCard>

            <InfoCard icon={CalendarDays} title="Funding Period">
              Funding Period From/To is stored in metadata so Finance can group monthly or
              custom-period reserves.
            </InfoCard>

            <InfoCard icon={Banknote} title="Clean Split">
              Funding Pool reserves money. Expense Payments distributes that money across verified
              expenses.
            </InfoCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
