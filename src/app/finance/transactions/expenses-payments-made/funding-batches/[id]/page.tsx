"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
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

import {
  AixiaAccessRule,
  AixiaActionCard,
  AixiaAlert,
  AixiaButton,
  AixiaDocumentUploadPanel,
  type AixiaDocumentUploadAttachment,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaNotFoundState,
  AixiaPage,
  AixiaReviewGrid,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaStatusBadge,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";
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

type ConfirmedPoolPaymentRow = {
  id: string;
  status: string;
  payment_source_type: string | null;
  expense_funding_batch_id: string | null;
  amount: number | string | null;
  converted_amount: number | string | null;
  payment_currency_code: string | null;
  metadata: {
    funding_currency_amount_used_for_payment?: number | string | null;
    funding_currency_code?: string | null;
    payment_currency_amount?: number | string | null;
    payment_currency_code?: string | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
  updated_at: string;
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

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
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

function getAttachmentSizeLabel(size: number | null | undefined) {
  if (!size) return "Size not saved";
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
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
  const [confirmedPoolPayments, setConfirmedPoolPayments] = useState<
    ConfirmedPoolPaymentRow[]
  >([]);
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

  const confirmedPoolUsedAmount = useMemo(() => {
    return confirmedPoolPayments.reduce((sum, payment) => {
      const metadataUsedAmount = toNumber(
        payment.metadata?.funding_currency_amount_used_for_payment
      );

      if (metadataUsedAmount > 0) {
        return sum + metadataUsedAmount;
      }

      const paymentCurrencyCode = normalizeCurrencyCode(
        payment.metadata?.payment_currency_code || payment.payment_currency_code
      );
      const fundingCurrencyCode = normalizeCurrencyCode(
        payment.metadata?.funding_currency_code || currencyCode
      );

      if (paymentCurrencyCode && paymentCurrencyCode === fundingCurrencyCode) {
        return sum + toNumber(
          payment.metadata?.payment_currency_amount || payment.converted_amount
        );
      }

      return sum;
    }, 0);
  }, [confirmedPoolPayments, currencyCode]);

  const remainingFundingPoolAmount = Math.max(
    fundingPoolAmount - confirmedPoolUsedAmount,
    0
  );

  const fundingPoolUsagePercent =
    fundingPoolAmount > 0
      ? Math.min((confirmedPoolUsedAmount / fundingPoolAmount) * 100, 100)
      : 0;

  const fundingPeriodFrom = getMetadataString(batch?.metadata, "funding_period_from");
  const fundingPeriodTo = getMetadataString(batch?.metadata, "funding_period_to");
  const fundingPeriodLabel =
    fundingPeriodFrom && fundingPeriodTo
      ? `${formatDate(fundingPeriodFrom)} → ${formatDate(fundingPeriodTo)}`
      : "Not saved";

  const fundingCompany = batch
    ? companyMap.get(batch.funding_company_id) || null
    : null;
  const fundingBankAccount = batch?.funding_bank_account_id
    ? bankAccountMap.get(batch.funding_bank_account_id) || null
    : null;

  const isArchivedOrDeleted =
    batch?.status === "archived" ||
    batch?.status === "deleted" ||
    batch?.status === "cancelled";
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

  const documentAttachments = useMemo<AixiaDocumentUploadAttachment[]>(() => {
    return attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileUpload?.file_name || "Funding proof",
      badge: <AixiaStatusBadge value={attachment.fileUpload?.mime_type || "file"} />,
      sizeLabel: getAttachmentSizeLabel(attachment.fileUpload?.file_size),
      description: `Uploaded ${formatDateTime(attachment.created_at)}`,
      openLabel: "Proof Saved",
    }));
  }, [attachments]);

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

      if (mode === "initial") {
        setPageError(null);
      }

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

        const [
          companiesResult,
          bankAccountsResult,
          currenciesResult,
          attachmentsResult,
          confirmedPaymentsResult,
        ] = await Promise.all([
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

          supabase
            .from("finance_payments_made")
            .select(
              "id, status, payment_source_type, expense_funding_batch_id, amount, converted_amount, payment_currency_code, metadata, created_at, updated_at"
            )
            .eq("payment_source_type", "operating_expense")
            .eq("expense_funding_batch_id", loadedBatch.id)
            .eq("status", "confirmed")
            .order("updated_at", { ascending: false }),
        ]);

        if (companiesResult.error) throw companiesResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;
        if (currenciesResult.error) throw currenciesResult.error;
        if (attachmentsResult.error) throw attachmentsResult.error;
        if (confirmedPaymentsResult.error) throw confirmedPaymentsResult.error;

        const attachmentRows = (attachmentsResult.data || []) as AttachmentRow[];
        const fileUploadIds = attachmentRows.map((attachment) => attachment.file_upload_id);
        let nextAttachments: AttachmentWithFile[] = [];

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

          nextAttachments = attachmentRows.map((attachment) => ({
            ...attachment,
            fileUpload: fileMap.get(attachment.file_upload_id) || null,
          }));
        }

        setBatch(loadedBatch);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
        setCurrencies((currenciesResult.data || []) as unknown as CurrencyRow[]);
        setConfirmedPoolPayments(
          (confirmedPaymentsResult.data || []) as unknown as ConfirmedPoolPaymentRow[]
        );
        setAttachments(nextAttachments);

        if (!isEditing) {
          setEditForm(buildEditForm(loadedBatch));
        }

        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load funding pool:", error);

        if (mode === "initial" || !hasLoadedOnce) {
          setPageError(
            error instanceof Error ? error.message : "Failed to load funding pool."
          );
          setBatch(null);
        }
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payments_made",
          filter: `expense_funding_batch_id=eq.${batchId}`,
        },
        () => void loadBatch("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadBatch("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
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

  const cancelEditing = useCallback(() => {
    if (!batch || runningAction) return;

    setEditForm(buildEditForm(batch));
    setIsEditing(false);
    setPageError(null);
    setPageMessage(null);
  }, [batch, buildEditForm, runningAction]);

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
      setPageError(
        error instanceof Error ? error.message : "Failed to update funding pool."
      );
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
      setPageError(
        error instanceof Error ? error.message : "Failed to upload funding pool proof."
      );
    } finally {
      setRunningAction(null);
    }
  }, [batch, fundingProofFile, loadBatch, runningAction]);

  const openExpensePaymentsTool = useCallback(() => {
    if (!batch || runningAction) return;

    setRunningAction("open_payment_tool");
    navigate(
      `/finance/transactions/expenses-payments-made/new?source=batch&batchId=${batch.id}`
    );
  }, [batch, navigate, runningAction]);

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading funding pool"
        description="Funding pool, companies, bank accounts, currencies, proof files, and confirmed usage are being loaded."
      />
    );
  }

  if (!batch) {
    return (
      <AixiaNotFoundState
        fullPage
        title="Funding pool not found"
        description={pageError || "The requested funding pool could not be loaded."}
        action={
          <AixiaButton
            type="button"
            variant="secondary"
            onClick={() => navigate("/finance/transactions/expenses-payments-made")}
          >
            Payment Control
          </AixiaButton>
        }
      />
    );
  }

  const editableForm = editForm || buildEditForm(batch);

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Payment Control"
        parentPath="/finance/transactions/expenses-payments-made"
        badges={[
          { label: "Funding Pool Detail", tone: "violet" },
          { label: isRefreshing ? "Silent Refresh" : "Realtime + 60s", tone: isRefreshing ? "gold" : "neutral" },
          { label: "Reserve Only", tone: "cyan" },
        ]}
        gradientTitle="FUNDING POOL"
        title=""
        subtitle={batch.batch_number}
        description="This is a period-based Finance reserve only. Expense matching and money distribution happen later in the separate Expense Payments tool."
        statusCards={[
          {
            label: "Funding Pool Total",
            value: `${currencyCode} ${formatMoney(fundingPoolAmount)}`,
            description: "Original amount reserved by Finance.",
            icon: Coins,
            tone: "violet",
          },
          {
            label: "Confirmed Used",
            value: `${currencyCode} ${formatMoney(confirmedPoolUsedAmount)}`,
            description: "Confirmed payment distributions already used from this pool.",
            icon: WalletCards,
            tone: "cyan",
          },
          {
            label: "Remaining Balance",
            value: `${currencyCode} ${formatMoney(remainingFundingPoolAmount)}`,
            description: "Available balance for future distributions.",
            icon: Banknote,
            tone: remainingFundingPoolAmount > 0 ? "emerald" : "neutral",
          },
        ]}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Funding Period"
          value={fundingPeriodLabel}
          description="The operating-expense period this pool should cover."
          icon={CalendarDays}
          tone="gold"
        />
        <AixiaMetricCard
          label="Funding Company"
          value={fundingCompany?.name || "—"}
          description="Company that owns the reserve."
          icon={Building2}
          tone={fundingCompany ? "cyan" : "neutral"}
        />
        <AixiaMetricCard
          label="Funding Bank"
          value={fundingBankAccount ? getBankLabel(fundingBankAccount) : "—"}
          description="Optional source bank account."
          icon={Banknote}
          tone={fundingBankAccount ? "emerald" : "neutral"}
        />
        <AixiaMetricCard
          label="Pool Status"
          value={<AixiaStatusBadge value={batch.status} />}
          description={`Documentation: ${batch.documentation_status || "missing"}`}
          icon={ShieldCheck}
          tone={isArchivedOrDeleted ? "rose" : "violet"}
        />
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Locked access rule"
        description="Funding pool detail pages use shared AiXia source-of-truth components only."
        icon={ShieldCheck}
      >
        This page edits the funding pool reserve only. It must use shared AiXia
        sections, value blocks, buttons, alerts, document upload panel, hero, and
        form fields. Local SectionCard, ValueBlock, oversized buttons, local glass
        cards, and local typography systems are not allowed.
      </AixiaAccessRule>

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        bottomSpan="auto"
        sideRebalance="last-to-bottom"
        main={
          <>
            <AixiaSection
              title="Funding Pool Overview"
              description="Funding source, period, pool amount, and audit context."
              icon={Archive}
              actions={
                isEditing ? (
                  <div className="aixia-action-row">
                    <AixiaButton
                      type="button"
                      variant="primary"
                      disabled={actionLocked}
                      onClick={() => void saveEdit()}
                    >
                      {runningAction === "save_edit" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {runningAction === "save_edit" ? "Saving..." : "Save Changes"}
                    </AixiaButton>
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      disabled={actionLocked}
                      onClick={cancelEditing}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </AixiaButton>
                  </div>
                ) : (
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    disabled={actionLocked || isArchivedOrDeleted}
                    onClick={startEditing}
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </AixiaButton>
                )
              }
            >
              {isEditing ? (
                <AixiaFormGrid columns="three">
                  <AixiaFormField>
                    <AixiaFieldLabel label="Funding Company" required />
                    <AixiaSelectField
                      value={editableForm.fundingCompanyId}
                      onChange={(event) =>
                        updateEditField("fundingCompanyId", event.target.value)
                      }
                      disabled={actionLocked}
                    >
                      <option value="">Select company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name || "Unnamed company"}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Funding Bank Account" />
                    <AixiaSelectField
                      value={editableForm.fundingBankAccountId}
                      onChange={(event) =>
                        updateEditField("fundingBankAccountId", event.target.value)
                      }
                      disabled={!editableForm.fundingCompanyId || actionLocked}
                    >
                      <option value="">No bank selected</option>
                      {availableEditBankAccounts.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {getBankLabel(bank)}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Allocation Date" required />
                    <AixiaInputField
                      type="date"
                      value={editableForm.allocationDate}
                      onChange={(event) =>
                        updateEditField("allocationDate", event.target.value)
                      }
                      disabled={actionLocked}
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Funding Period From" required />
                    <AixiaInputField
                      type="date"
                      value={editableForm.fundingPeriodFrom}
                      onChange={(event) =>
                        updateEditField("fundingPeriodFrom", event.target.value)
                      }
                      disabled={actionLocked}
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Funding Period To" required />
                    <AixiaInputField
                      type="date"
                      value={editableForm.fundingPeriodTo}
                      onChange={(event) =>
                        updateEditField("fundingPeriodTo", event.target.value)
                      }
                      disabled={actionLocked}
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Funding Currency" required />
                    <AixiaSelectField
                      value={editableForm.currencyCode}
                      onChange={(event) =>
                        updateEditField("currencyCode", event.target.value)
                      }
                      disabled={actionLocked}
                    >
                      <option value="">Select currency</option>
                      {currencyOptions.map((currency) => (
                        <option key={currency.id} value={currency.currency_code}>
                          {currency.currency_code} — {currency.currency_name}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Funding Pool Amount" required />
                    <AixiaInputField
                      value={editableForm.fundingPoolAmount}
                      onChange={(event) =>
                        updateEditField("fundingPoolAmount", event.target.value)
                      }
                      disabled={actionLocked}
                      inputMode="decimal"
                      placeholder="0.00"
                    />
                  </AixiaFormField>

                  <AixiaFormFullWidth>
                    <AixiaValueBlock
                      label="Pool Meaning"
                      value="Reserve only — no expense selection and no money distribution"
                      detail="Expense matching and disbursement happen later from Expense Payments."
                    />
                  </AixiaFormFullWidth>

                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Funding Notes" />
                    <AixiaTextareaField
                      value={editableForm.notes}
                      onChange={(event) => updateEditField("notes", event.target.value)}
                      disabled={actionLocked}
                      placeholder="Internal funding pool notes"
                    />
                  </AixiaFormFullWidth>
                </AixiaFormGrid>
              ) : (
                <AixiaReviewGrid variant="cards">
                  <AixiaValueBlock label="Funding Pool Number" value={batch.batch_number} />
                  <AixiaValueBlock
                    label="Funding Pool Total"
                    value={`${currencyCode} ${formatMoney(fundingPoolAmount)}`}
                    detail="Original amount reserved by Finance."
                  />
                  <AixiaValueBlock
                    label="Confirmed Used"
                    value={`${currencyCode} ${formatMoney(confirmedPoolUsedAmount)}`}
                    detail="Only confirmed expense payment distributions count as used."
                  />
                  <AixiaValueBlock
                    label="Remaining Balance"
                    value={`${currencyCode} ${formatMoney(remainingFundingPoolAmount)}`}
                    detail={`${formatMoney(fundingPoolUsagePercent)}% of this funding pool has been used.`}
                  />
                  <AixiaValueBlock label="Funding Period" value={fundingPeriodLabel} />
                  <AixiaValueBlock
                    label="Allocation Date"
                    value={formatDate(batch.allocation_date)}
                  />
                  <AixiaValueBlock
                    label="Funding Company"
                    value={fundingCompany?.name || "—"}
                  />
                  <AixiaValueBlock
                    label="Funding Bank"
                    value={getBankLabel(fundingBankAccount)}
                  />
                  <AixiaValueBlock label="Currency" value={batch.currency_code || "—"} />
                  <AixiaValueBlock
                    label="Status"
                    value={<AixiaStatusBadge value={batch.status} />}
                  />
                  <AixiaValueBlock
                    label="Documentation"
                    value={<AixiaStatusBadge value={batch.documentation_status} />}
                  />
                  <AixiaValueBlock
                    label="Created"
                    value={formatDateTime(batch.created_at)}
                    detail={`Updated ${formatDateTime(batch.updated_at)}`}
                  />
                  <AixiaValueBlock
                    label="Pool Meaning"
                    value="Reserve only — no expense distribution"
                    detail="Expense matching and payment distribution happen later."
                  />
                  <AixiaValueBlock
                    label="Confirmed By"
                    value={batch.allocated_by ? "Recorded" : "Not confirmed yet"}
                  />
                  <AixiaValueBlock
                    label="Proof"
                    value={attachments.length > 0 ? "Attached" : "Not attached"}
                    detail="Proof is required before confirming the funding pool."
                  />
                  {batch.notes ? <AixiaValueBlock label="Notes" value={batch.notes} /> : null}
                </AixiaReviewGrid>
              )}
            </AixiaSection>

            <AixiaSection
              title="Funding Proof"
              description="Files uploaded as proof that this funding pool was approved, reserved, or transferred."
              icon={UploadCloud}
            >
              <AixiaDocumentUploadPanel
                selectedFile={fundingProofFile}
                attachments={documentAttachments}
                required={isDraftPool}
                disabled={actionLocked || isArchivedOrDeleted}
                uploading={runningAction === "upload_proof"}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                dropTitle="Drop funding proof here"
                dropDescription="Attach bank confirmation, internal approval, funding report, reserve document, or Finance proof."
                uploadLabel="Upload Proof"
                uploadingLabel="Uploading Proof..."
                selectedFileLabel="Selected funding proof"
                emptyTitle="No funding proof uploaded"
                emptyDescription="Upload proof before confirming this funding pool."
                requiredMessage="Funding proof is required before confirming a draft funding pool."
                onFileSelect={(file) => {
                  setFundingProofFile(file);
                  setPageError(null);
                  setPageMessage(null);
                }}
                onRemoveSelectedFile={() => setFundingProofFile(null)}
                onUpload={() => void uploadFundingProof()}
              />
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Funding Pool Actions"
              description="Confirm the pool, verify proof, or open the separate payment distribution tool."
              icon={ShieldCheck}
            >
              <div className="aixia-stack">
                {isArchivedOrDeleted ? (
                  <AixiaAlert tone="error">
                    This funding pool is archived, deleted, or cancelled. Normal actions are hidden.
                  </AixiaAlert>
                ) : null}

                {isDraftPool ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    disabled={actionLocked || !canConfirmPool}
                    onClick={() => void confirmFundingPool()}
                  >
                    {runningAction === "confirm_pool" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {runningAction === "confirm_pool"
                      ? "Confirming..."
                      : "Confirm Funding Pool"}
                  </AixiaButton>
                ) : null}

                {!isDraftPool && isConfirmedPool ? (
                  <AixiaAlert tone="success">
                    This funding pool is confirmed. It can now be used by the separate
                    Expense Payments tool to distribute money across verified expenses.
                  </AixiaAlert>
                ) : null}

                {canVerifyProof ? (
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    disabled={actionLocked}
                    onClick={() => void verifyProof()}
                  >
                    {runningAction === "verify_proof" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileCheck2 className="h-4 w-4" />
                    )}
                    {runningAction === "verify_proof" ? "Verifying..." : "Verify Proof"}
                  </AixiaButton>
                ) : null}

                {isConfirmedPool && !isArchivedOrDeleted ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    disabled={actionLocked}
                    onClick={openExpensePaymentsTool}
                  >
                    {runningAction === "open_payment_tool" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <WalletCards className="h-4 w-4" />
                    )}
                    {runningAction === "open_payment_tool"
                      ? "Opening..."
                      : "Open Expense Payments Tool"}
                  </AixiaButton>
                ) : null}

                {!isArchivedOrDeleted && isDraftPool && attachments.length === 0 ? (
                  <AixiaAlert tone="info">
                    Upload funding proof before confirming this funding pool.
                  </AixiaAlert>
                ) : null}
              </div>
            </AixiaSection>

            <AixiaSection
              title="Status Summary"
              description="Current funding pool state."
              icon={Clock3}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Pool Status"
                  value={<AixiaStatusBadge value={batch.status} />}
                />
                <AixiaValueBlock
                  label="Documentation"
                  value={<AixiaStatusBadge value={batch.documentation_status} />}
                />
                <AixiaValueBlock
                  label="Funding Pool Total"
                  value={`${currencyCode} ${formatMoney(fundingPoolAmount)}`}
                  detail="Period-based money reserve."
                />
                <AixiaValueBlock
                  label="Confirmed Used"
                  value={`${currencyCode} ${formatMoney(confirmedPoolUsedAmount)}`}
                  detail="Confirmed expense payment distributions only."
                />
                <AixiaValueBlock
                  label="Remaining Balance"
                  value={`${currencyCode} ${formatMoney(remainingFundingPoolAmount)}`}
                  detail="Available for future expense payment distributions."
                />
                <AixiaValueBlock
                  label="Funding Period"
                  value={fundingPeriodLabel}
                  detail="Stored in metadata."
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Funding Workflow Notes"
              description="Clean split between reserve and distribution."
              icon={Sparkles}
            >
              <div className="aixia-stack">
                <AixiaActionCard
                  label="Funding Pool"
                  value="Period-based reserve"
                  description="This record reserves a money pool from one company and optional bank account."
                  icon={Coins}
                  tone="violet"
                />
                <AixiaActionCard
                  label="Expense Payments"
                  value="Distribution tool"
                  description="Actual distribution across verified expenses happens only on the Expense Payments page."
                  icon={WalletCards}
                  tone="cyan"
                />
                <AixiaActionCard
                  label="No Expense Selection"
                  value="Reserve page only"
                  description="This page does not select, match, or distribute money to individual expenses."
                  icon={Building2}
                  tone="neutral"
                />
                <AixiaActionCard
                  label="Funding Period"
                  value="Metadata controlled"
                  description="Funding Period From/To is stored in metadata so Finance can group monthly or custom-period reserves."
                  icon={CalendarDays}
                  tone="gold"
                />
                <AixiaActionCard
                  label="Clean Split"
                  value="Reserve then distribute"
                  description="Funding Pool reserves money. Expense Payments distributes that money across verified expenses."
                  icon={Banknote}
                  tone="emerald"
                />
              </div>
            </AixiaSection>
          </>
        }
      />
    </AixiaPage>
  );
}
