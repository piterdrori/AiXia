import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  Edit3,
  Eye,
  FileCheck2,
  Loader2,
  Save,
  ShieldCheck,
  UploadCloud,
  WalletCards,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  AixiaActionStack,
  AixiaAlert,
  AixiaButton,
  AixiaAccessRule,
  AixiaDisplayBlock,
  AixiaDocumentUploadPanel,
  type AixiaDocumentUploadAttachment,
  AixiaEmptyState,
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
  AixiaRegistryToolbar,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaSortableHeader,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";
import type { FinanceLoadMode } from "@/lib/finance/pageAccess";

type FundingBatchRow = {
  id: string;
  batch_number: string;
  funding_company_id: string;
  funding_bank_account_id: string | null;
  allocation_date: string;
  period_start: string | null;
  period_end: string | null;
  currency_code: string;
  allocated_amount: number | string | null;
  status: string;
  documentation_status: string | null;
  notes: string | null;
  metadata: {
    used_amount?: number | string | null;
    remaining_amount?: number | string | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type CompanyRow = {
  id: string;
  name: string | null;
  legal_name: string | null;
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
  signedUrl: string | null;
};

type PaymentDistributionRow = {
  id: string;
  distribution_number: string;
  funding_batch_id: string;
  payment_date: string;
  status: string;
  paid_from_company_id: string | null;
  paid_from_bank_account_id: string | null;
  amount: number | string | null;
  payment_currency_code: string;
  funding_currency_code: string | null;
  funding_currency_amount: number | string | null;
  exchange_rate: number | string | null;
  exchange_rate_source: string | null;
  exchange_rate_date: string | null;
  reference_number: string | null;
  recipient_confirmation_status: string | null;
  payment_proof_status: string | null;
  notes: string | null;
  metadata: {
    allocation_count?: number | string | null;
    payment_currency_amount?: number | string | null;
    paycheck_currency_coverage_total?: number | string | null;
    funding_currency_amount_used_for_payment?: number | string | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
  updated_at: string;
};

type PaymentAllocationRow = {
  id: string;
  distribution_id: string;
  paycheck_request_id: string;
  funding_batch_id: string | null;
  allocated_amount: number | string | null;
  currency_code: string | null;
  payment_currency_code: string | null;
  converted_amount: number | string | null;
  funding_currency_code: string | null;
  funding_currency_amount: number | string | null;
  recipient_confirmation_status: string | null;
  created_at: string;
  updated_at: string;
};

type EnrichedDistributionRow = PaymentDistributionRow & {
  allocationCount: number;
  paycheckCoverageAmount: number;
  paymentCurrencyAmount: number;
  fundingCurrencyUsedAmount: number;
};

type EditFormState = {
  fundingCompanyId: string;
  fundingBankAccountId: string;
  payrollPeriodFrom: string;
  payrollPeriodTo: string;
  allocationDate: string;
  currencyCode: string;
  allocatedPayrollAmount: string;
  notes: string;
};

type RunningAction =
  | "save_edit"
  | "confirm_pool"
  | "verify_proof"
  | "upload_proof"
  | "refresh_usage"
  | "open_payment_tool";

type LoadMode = FinanceLoadMode;
type DistributionSortKey =
  | "distribution_number"
  | "payment_date"
  | "funding_used"
  | "paycheck_coverage"
  | "allocation_count"
  | "status"
  | "recipient_confirmation_status";
type SortDirection = "asc" | "desc";

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

function getCompanyName(company: CompanyRow | null | undefined) {
  if (!company) return "—";
  return company.legal_name || company.name || "Company selected";
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

function getDistributionSortValue(
  distribution: EnrichedDistributionRow,
  key: DistributionSortKey,
) {
  switch (key) {
    case "distribution_number":
      return String(distribution.distribution_number || "").toLowerCase();
    case "payment_date":
      return distribution.payment_date
        ? new Date(distribution.payment_date).getTime()
        : 0;
    case "funding_used":
      return distribution.fundingCurrencyUsedAmount;
    case "paycheck_coverage":
      return distribution.paycheckCoverageAmount;
    case "allocation_count":
      return distribution.allocationCount;
    case "status":
      return String(distribution.status || "").toLowerCase();
    case "recipient_confirmation_status":
      return String(distribution.recipient_confirmation_status || "").toLowerCase();
    default:
      return "";
  }
}

function compareSortValues(
  firstValue: string | number,
  secondValue: string | number,
  direction: SortDirection,
) {
  if (typeof firstValue === "number" && typeof secondValue === "number") {
    return direction === "asc"
      ? firstValue - secondValue
      : secondValue - firstValue;
  }

  return direction === "asc"
    ? String(firstValue).localeCompare(String(secondValue))
    : String(secondValue).localeCompare(String(firstValue));
}

function getAttachmentFileSizeLabel(size: number | null | undefined) {
  if (!size) return undefined;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function DistributionTable({
  rows,
  currencyCode,
  sortKey,
  sortDirection,
  onSort,
  onOpen,
}: {
  rows: EnrichedDistributionRow[];
  currencyCode: string;
  sortKey: DistributionSortKey;
  sortDirection: SortDirection;
  onSort: (key: DistributionSortKey) => void;
  onOpen: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <AixiaEmptyState
        icon={WalletCards}
        title="No paycheck payment distributions yet"
        description="After Finance distributes this payroll pool across approved paycheck requests, those distributions will appear here."
      />
    );
  }

  return (
    <AixiaTableShell
      variant="registry"
      minWidthClassName="min-w-[1180px]"
      maxHeightClassName="max-h-[520px]"
    >
      <thead className="aixia-table-head">
        <tr>
          <th>
            <AixiaSortableHeader
              label="Distribution"
              sortKey="distribution_number"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              align="left"
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Payment Date"
              sortKey="payment_date"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              align="left"
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Funding Used"
              sortKey="funding_used"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              align="right"
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Paycheck Coverage"
              sortKey="paycheck_coverage"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              align="right"
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Lines"
              sortKey="allocation_count"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              align="left"
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Status"
              sortKey="status"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              align="left"
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Employee Confirmation"
              sortKey="recipient_confirmation_status"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              align="left"
            />
          </th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((distribution) => (
          <tr key={distribution.id} className="aixia-table-row">
            <AixiaTableTextCell
              width="lg"
              primary={distribution.distribution_number}
              secondary={`Ref ${distribution.reference_number || "—"}`}
            />
            <AixiaTableDateCell width="md">
              {formatDate(distribution.payment_date)}
            </AixiaTableDateCell>
            <AixiaTableTextCell
              width="md"
              primary={`${currencyCode} ${formatMoney(
                distribution.fundingCurrencyUsedAmount,
              )}`}
              secondary={`Payment ${distribution.payment_currency_code} ${formatMoney(
                distribution.paymentCurrencyAmount,
              )}`}
            />
            <AixiaTableTextCell
              width="md"
              primary={formatMoney(distribution.paycheckCoverageAmount)}
            />
            <AixiaTableTextCell
              width="sm"
              primary={distribution.allocationCount}
              secondary="Paycheck allocation lines"
            />
            <AixiaTableBadgeCell width="md">
              <AixiaStatusBadge value={distribution.status} />
            </AixiaTableBadgeCell>
            <AixiaTableBadgeCell width="md">
              <AixiaStatusBadge value={distribution.recipient_confirmation_status} />
            </AixiaTableBadgeCell>
            <AixiaTableActionsCell>
              <AixiaButton
                type="button"
                variant="primary"
                onClick={() => onOpen(distribution.id)}
              >
                <Eye className="h-4 w-4" />
                Open
              </AixiaButton>
            </AixiaTableActionsCell>
          </tr>
        ))}
      </tbody>
    </AixiaTableShell>
  );
}

export default function FinancePayrollFundingBatchDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const batchId = params.id;

  const [batch, setBatch] = useState<FundingBatchRow | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentWithFile[]>([]);
  const [paymentDistributions, setPaymentDistributions] = useState<
    PaymentDistributionRow[]
  >([]);
  const [paymentAllocations, setPaymentAllocations] = useState<
    PaymentAllocationRow[]
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
  const [distributionSortKey, setDistributionSortKey] =
    useState<DistributionSortKey>("payment_date");
  const [distributionSortDirection, setDistributionSortDirection] =
    useState<SortDirection>("desc");

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((bank) => [bank.id, bank]));
  }, [bankAccounts]);

  const currencyOptions = useMemo(() => {
    return currencies.filter((currency) => currency.status === "active");
  }, [currencies]);

  const allocationsByDistributionId = useMemo(() => {
    const map = new Map<string, PaymentAllocationRow[]>();

    paymentAllocations.forEach((allocation) => {
      const current = map.get(allocation.distribution_id) || [];
      current.push(allocation);
      map.set(allocation.distribution_id, current);
    });

    return map;
  }, [paymentAllocations]);

  const enrichedDistributions = useMemo<EnrichedDistributionRow[]>(() => {
    return paymentDistributions.map((distribution) => {
      const allocationRows = allocationsByDistributionId.get(distribution.id) || [];

      const paycheckCoverageAmount = allocationRows.reduce(
        (sum, allocation) => sum + toNumber(allocation.allocated_amount),
        0,
      );

      const paymentCurrencyAmount =
        toNumber(distribution.metadata?.payment_currency_amount) ||
        allocationRows.reduce(
          (sum, allocation) => sum + toNumber(allocation.converted_amount),
          0,
        );

      const fundingCurrencyUsedAmount =
        toNumber(distribution.funding_currency_amount) ||
        toNumber(distribution.metadata?.funding_currency_amount_used_for_payment) ||
        allocationRows.reduce(
          (sum, allocation) =>
            sum +
            toNumber(
              allocation.funding_currency_amount ||
                allocation.converted_amount ||
                allocation.allocated_amount,
            ),
          0,
        );

      return {
        ...distribution,
        allocationCount: Number(
          distribution.metadata?.allocation_count ?? allocationRows.length,
        ),
        paycheckCoverageAmount,
        paymentCurrencyAmount,
        fundingCurrencyUsedAmount,
      };
    });
  }, [allocationsByDistributionId, paymentDistributions]);

  const sortedEnrichedDistributions = useMemo(() => {
    return [...enrichedDistributions].sort((first, second) => {
      return compareSortValues(
        getDistributionSortValue(first, distributionSortKey),
        getDistributionSortValue(second, distributionSortKey),
        distributionSortDirection,
      );
    });
  }, [distributionSortDirection, distributionSortKey, enrichedDistributions]);

  const currencyCode = normalizeCurrencyCode(batch?.currency_code || "USD");
  const allocatedPayrollAmount = toNumber(batch?.allocated_amount);

  const confirmedUsedAmount = useMemo(() => {
    return enrichedDistributions
      .filter((distribution) => distribution.status === "confirmed")
      .reduce(
        (sum, distribution) => sum + distribution.fundingCurrencyUsedAmount,
        0,
      );
  }, [enrichedDistributions]);

  const remainingPayrollFundingAmount = Math.max(
    allocatedPayrollAmount - confirmedUsedAmount,
    0,
  );

  const usagePercent =
    allocatedPayrollAmount > 0
      ? Math.min((confirmedUsedAmount / allocatedPayrollAmount) * 100, 100)
      : 0;

  const payrollPeriodLabel =
    batch?.period_start && batch?.period_end
      ? `${formatDate(batch.period_start)} → ${formatDate(batch.period_end)}`
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
  const isConfirmedPool =
    batch?.status === "allocated" ||
    batch?.status === "confirmed" ||
    batch?.status === "partially_used" ||
    batch?.status === "fully_used" ||
    batch?.status === "over_allocated";

  const canVerifyProof =
    attachments.length > 0 &&
    batch?.documentation_status !== "verified" &&
    !isArchivedOrDeleted;
  const canConfirmPool = isDraftPool && attachments.length > 0 && !isArchivedOrDeleted;
  const actionLocked = Boolean(runningAction);

  const availableEditBankAccounts = useMemo(() => {
    if (!editForm?.fundingCompanyId) return [];
    return bankAccounts.filter(
      (bank) => bank.company_id === editForm.fundingCompanyId,
    );
  }, [bankAccounts, editForm?.fundingCompanyId]);

  const uploadAttachments = useMemo<AixiaDocumentUploadAttachment[]>(() => {
    return attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileUpload?.file_name || "Payroll funding proof",
      badge: formatLabel(attachment.metadata?.resolved_mime_type || "Stored"),
      sizeLabel: getAttachmentFileSizeLabel(attachment.fileUpload?.file_size),
      description: `${attachment.fileUpload?.mime_type || "Unknown type"} • ${formatDateTime(
        attachment.created_at,
      )}`,
      openLabel: "Open",
    }));
  }, [attachments]);

  const buildEditForm = useCallback(
    (nextBatch: FundingBatchRow): EditFormState => {
      return {
        fundingCompanyId: nextBatch.funding_company_id || "",
        fundingBankAccountId: nextBatch.funding_bank_account_id || "",
        payrollPeriodFrom: nextBatch.period_start || "",
        payrollPeriodTo: nextBatch.period_end || "",
        allocationDate: nextBatch.allocation_date || getTodayIsoDate(),
        currencyCode: normalizeCurrencyCode(nextBatch.currency_code || "USD"),
        allocatedPayrollAmount: String(toNumber(nextBatch.allocated_amount)),
        notes: nextBatch.notes || "",
      };
    },
    [],
  );

  const loadBatch = useCallback(
    async (mode: LoadMode = "initial") => {
      if (!batchId) {
        setPageError("Missing payroll funding pool ID.");
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
          .from("finance_paycheck_funding_batches")
          .select(
            [
              "id",
              "batch_number",
              "funding_company_id",
              "funding_bank_account_id",
              "allocation_date",
              "period_start",
              "period_end",
              "currency_code",
              "allocated_amount",
              "status",
              "documentation_status",
              "notes",
              "metadata",
              "created_at",
              "updated_at",
              "created_by",
              "updated_by",
            ].join(", "),
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
          distributionsResult,
          allocationsResult,
        ] = await Promise.all([
          supabase
            .from("finance_companies")
            .select("id, name, legal_name")
            .order("name"),

          supabase
            .from("finance_bank_accounts")
            .select(
              "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id, is_default",
            )
            .order("name"),

          supabase
            .from("finance_currencies")
            .select(
              "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status",
            )
            .eq("status", "active")
            .order("currency_code"),

          supabase
            .from("finance_record_attachments")
            .select(
              "id, entity_type, entity_id, file_upload_id, uploaded_by, notes, metadata, created_at",
            )
            .eq("entity_type", "finance_paycheck_funding_batch")
            .eq("entity_id", loadedBatch.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("finance_paycheck_payment_distributions")
            .select(
              [
                "id",
                "distribution_number",
                "funding_batch_id",
                "payment_date",
                "status",
                "paid_from_company_id",
                "paid_from_bank_account_id",
                "amount",
                "payment_currency_code",
                "funding_currency_code",
                "funding_currency_amount",
                "exchange_rate",
                "exchange_rate_source",
                "exchange_rate_date",
                "reference_number",
                "recipient_confirmation_status",
                "payment_proof_status",
                "notes",
                "metadata",
                "created_at",
                "updated_at",
              ].join(", "),
            )
            .eq("funding_batch_id", loadedBatch.id)
            .order("updated_at", { ascending: false }),

          supabase
            .from("finance_paycheck_payment_allocations")
            .select(
              [
                "id",
                "distribution_id",
                "paycheck_request_id",
                "funding_batch_id",
                "allocated_amount",
                "currency_code",
                "payment_currency_code",
                "converted_amount",
                "funding_currency_code",
                "funding_currency_amount",
                "recipient_confirmation_status",
                "created_at",
                "updated_at",
              ].join(", "),
            )
            .eq("funding_batch_id", loadedBatch.id)
            .order("updated_at", { ascending: false }),
        ]);

        if (companiesResult.error) throw companiesResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;
        if (currenciesResult.error) throw currenciesResult.error;
        if (attachmentsResult.error) throw attachmentsResult.error;
        if (distributionsResult.error) throw distributionsResult.error;
        if (allocationsResult.error) throw allocationsResult.error;

        setBatch(loadedBatch);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
        setCurrencies((currenciesResult.data || []) as unknown as CurrencyRow[]);
        setPaymentDistributions(
          (distributionsResult.data || []) as unknown as PaymentDistributionRow[],
        );
        setPaymentAllocations(
          (allocationsResult.data || []) as unknown as PaymentAllocationRow[],
        );

        if (!isEditing) {
          setEditForm(buildEditForm(loadedBatch));
        }

        const attachmentRows = (attachmentsResult.data || []) as AttachmentRow[];
        const fileUploadIds = attachmentRows.map(
          (attachment) => attachment.file_upload_id,
        );

        if (fileUploadIds.length > 0) {
          const fileUploadsResult = await supabase
            .from("file_uploads")
            .select(
              "id, file_name, file_path, file_size, mime_type, entity_type, created_at",
            )
            .in("id", fileUploadIds);

          if (fileUploadsResult.error) throw fileUploadsResult.error;

          const fileMap = new Map(
            ((fileUploadsResult.data || []) as FileUploadRow[]).map((file) => [
              file.id,
              file,
            ]),
          );

          const signedAttachments = await Promise.all(
            attachmentRows.map(async (attachment) => {
              const fileUpload = fileMap.get(attachment.file_upload_id) || null;
              const bucket =
                attachment.metadata?.bucket ||
                "finance-paycheck-funding-batch-documents";

              let signedUrl: string | null = null;

              if (fileUpload?.file_path && bucket) {
                const signedResult = await supabase.storage
                  .from(bucket)
                  .createSignedUrl(fileUpload.file_path, 3600);

                if (!signedResult.error) {
                  signedUrl = signedResult.data.signedUrl;
                }
              }

              return {
                ...attachment,
                fileUpload,
                signedUrl,
              };
            }),
          );

          setAttachments(signedAttachments);
        } else {
          setAttachments([]);
        }

        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load payroll funding pool:", error);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to load payroll funding pool.",
        );
        if (!hasLoadedOnce) setBatch(null);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [batchId, buildEditForm, hasLoadedOnce, isEditing],
  );

  useEffect(() => {
    void loadBatch("initial");
  }, [loadBatch]);

  useEffect(() => {
    if (!batchId) return undefined;

    const channel = supabase
      .channel(`finance-payroll-funding-pool-detail-${batchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_funding_batches",
          filter: `id=eq.${batchId}`,
        },
        () => void loadBatch("silent"),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${batchId}`,
        },
        () => void loadBatch("silent"),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_payment_distributions",
          filter: `funding_batch_id=eq.${batchId}`,
        },
        () => void loadBatch("silent"),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_payment_allocations",
          filter: `funding_batch_id=eq.${batchId}`,
        },
        () => void loadBatch("silent"),
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
            bankAccounts.find(
              (bank) => bank.company_id === value && bank.is_default,
            )?.id ||
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
    [bankAccounts],
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
      const nextAmount = toNumber(editForm.allocatedPayrollAmount);
      const nextCurrency = normalizeCurrencyCode(editForm.currencyCode);

      if (!editForm.fundingCompanyId) {
        setPageError("Funding company is required.");
        return;
      }

      if (!editForm.allocationDate) {
        setPageError("Allocation date is required.");
        return;
      }

      if (!editForm.payrollPeriodFrom) {
        setPageError("Payroll period start date is required.");
        return;
      }

      if (!editForm.payrollPeriodTo) {
        setPageError("Payroll period end date is required.");
        return;
      }

      if (editForm.payrollPeriodTo < editForm.payrollPeriodFrom) {
        setPageError("Payroll period end date cannot be before the start date.");
        return;
      }

      if (!nextCurrency) {
        setPageError("Funding currency is required.");
        return;
      }

      if (nextAmount <= 0) {
        setPageError("Allocated payroll amount must be greater than zero.");
        return;
      }

      const selectedBank = editForm.fundingBankAccountId
        ? bankAccountMap.get(editForm.fundingBankAccountId)
        : null;

      if (selectedBank && selectedBank.company_id !== editForm.fundingCompanyId) {
        setPageError("Funding bank account must belong to the funding company.");
        return;
      }

      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const actorUserId = authResult.data.user?.id ?? null;

      const nextMetadata = {
        ...(batch.metadata || {}),
        allocation_mode: "payroll_funding_pool_reserve",
        allocated_payroll_amount: nextAmount,
        funding_pool_currency: nextCurrency,
        payroll_period_from: editForm.payrollPeriodFrom,
        payroll_period_to: editForm.payrollPeriodTo,
        process_scope: "paycheck_payment_execution_tools",
        paycheck_selection_allowed: false,
        paycheck_distribution_allowed: false,
        last_edited_from: "payroll_funding_pool_detail_page",
      };

      const updateResult = await supabase
        .from("finance_paycheck_funding_batches")
        .update({
          funding_company_id: editForm.fundingCompanyId,
          funding_bank_account_id: editForm.fundingBankAccountId || null,
          allocation_date: editForm.allocationDate,
          period_start: editForm.payrollPeriodFrom,
          period_end: editForm.payrollPeriodTo,
          currency_code: nextCurrency,
          allocated_amount: nextAmount,
          notes: editForm.notes.trim() || null,
          metadata: nextMetadata,
          updated_by: actorUserId,
        })
        .eq("id", batch.id);

      if (updateResult.error) throw updateResult.error;

      setPageMessage("Payroll funding pool details updated.");
      setIsEditing(false);
      await loadBatch("silent");
    } catch (error) {
      console.error("Failed to update payroll funding pool:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to update payroll funding pool.",
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
      successMessage: string,
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
    [loadBatch, runningAction],
  );

  const confirmFundingPool = useCallback(async () => {
    if (!batch || runningAction) return;

    if (attachments.length === 0) {
      setPageError(
        "Payroll funding proof is required before confirming this funding pool.",
      );
      return;
    }

    await runBatchRpc(
      "confirm_pool",
      "finance_confirm_paycheck_funding_batch",
      {
        p_batch_id: batch.id,
      },
      "Payroll funding pool confirmed.",
    );
  }, [attachments.length, batch, runBatchRpc, runningAction]);

  const verifyProof = useCallback(async () => {
    if (!batch || runningAction) return;

    await runBatchRpc(
      "verify_proof",
      "finance_mark_paycheck_funding_batch_documentation",
      {
        p_batch_id: batch.id,
        p_documentation_status: "verified",
        p_notes: "Payroll funding pool documentation verified.",
      },
      "Payroll funding pool documentation verified.",
    );
  }, [batch, runBatchRpc, runningAction]);

  const refreshUsage = useCallback(async () => {
    if (!batch || runningAction) return;

    await runBatchRpc(
      "refresh_usage",
      "finance_refresh_paycheck_funding_batch_usage",
      {
        p_batch_id: batch.id,
      },
      "Payroll funding pool usage refreshed.",
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
        .from("finance-paycheck-funding-batch-documents")
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
          entity_type: "finance_paycheck_funding_batch",
        })
        .select("id")
        .single();

      if (fileUploadResult.error) throw fileUploadResult.error;

      const attachmentResult = await supabase
        .from("finance_record_attachments")
        .insert({
          entity_type: "finance_paycheck_funding_batch",
          entity_id: batch.id,
          file_upload_id: fileUploadResult.data.id,
          uploaded_by: userId,
          notes: "Payroll funding pool proof",
          metadata: {
            bucket: "finance-paycheck-funding-batch-documents",
            uploaded_from: "payroll_funding_pool_detail_page",
            resolved_mime_type: resolvedMimeType,
          },
        });

      if (attachmentResult.error) throw attachmentResult.error;

      const documentationResult = await supabase.rpc(
        "finance_mark_paycheck_funding_batch_documentation",
        {
          p_batch_id: batch.id,
          p_documentation_status: "uploaded",
          p_notes: "Payroll funding proof uploaded.",
        },
      );

      if (documentationResult.error) throw documentationResult.error;

      setFundingProofFile(null);
      setPageMessage("Payroll funding proof uploaded.");
      await loadBatch("silent");
    } catch (error) {
      console.error("Failed to upload payroll funding proof:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to upload payroll funding proof.",
      );
    } finally {
      setRunningAction(null);
    }
  }, [batch, fundingProofFile, loadBatch, runningAction]);

  const openPaycheckPaymentTool = useCallback(() => {
    if (!batch || runningAction) return;

    setRunningAction("open_payment_tool");
    navigate(`/finance/transactions/payroll/new?source=batch&batchId=${batch.id}`);
  }, [batch, navigate, runningAction]);

  const openFundingProofAttachment = useCallback(
    (attachment: AixiaDocumentUploadAttachment) => {
      const sourceAttachment = attachments.find((item) => item.id === attachment.id);
      if (!sourceAttachment?.signedUrl) return;
      window.open(sourceAttachment.signedUrl, "_blank", "noopener,noreferrer");
    },
    [attachments],
  );

  const handleDistributionSort = useCallback(
    (key: DistributionSortKey) => {
      if (distributionSortKey === key) {
        setDistributionSortDirection((current) =>
          current === "asc" ? "desc" : "asc",
        );
        return;
      }

      setDistributionSortKey(key);
      setDistributionSortDirection(key === "payment_date" ? "desc" : "asc");
    },
    [distributionSortKey],
  );

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading payroll funding pool"
        description="Funding pool, proof documents, usage, and linked distributions are being loaded."
      />
    );
  }

  if (!batch) {
    return (
      <AixiaNotFoundState
        fullPage
        title="Payroll funding pool not found"
        description={
          pageError || "The requested payroll funding pool could not be loaded."
        }
        action={
          <AixiaButton
            type="button"
            variant="secondary"
            onClick={() => navigate("/finance/transactions/payroll")}
          >
            Payroll
          </AixiaButton>
        }
      />
    );
  }

  const editableForm = editForm || buildEditForm(batch);

  const mainContent = (
    <>
      <AixiaSection
        title="Payroll Funding Pool Overview"
        description="Funding source, payroll period, pool amount, and audit context."
        icon={Archive}
        actions={
          <AixiaActionStack>
            {isEditing ? (
              <>
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
              </>
            ) : (
              <AixiaButton
                type="button"
                variant="primary"
                disabled={actionLocked || isArchivedOrDeleted}
                onClick={startEditing}
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </AixiaButton>
            )}
          </AixiaActionStack>
        }
      >
        <AixiaAlert tone="info">
          This page edits the funding pool only. It does not select or pay
          paycheck requests.
        </AixiaAlert>

        {isEditing ? (
          <AixiaFormGrid columns="three">
            <AixiaFormField>
              <AixiaFieldLabel label="Funding Company" />
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
                    {getCompanyName(company)}
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
              <AixiaFieldLabel label="Allocation Date" />
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
              <AixiaFieldLabel label="Payroll Period From" />
              <AixiaInputField
                type="date"
                value={editableForm.payrollPeriodFrom}
                onChange={(event) =>
                  updateEditField("payrollPeriodFrom", event.target.value)
                }
                disabled={actionLocked}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Payroll Period To" />
              <AixiaInputField
                type="date"
                value={editableForm.payrollPeriodTo}
                onChange={(event) =>
                  updateEditField("payrollPeriodTo", event.target.value)
                }
                disabled={actionLocked}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Funding Currency" />
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
              <AixiaFieldLabel
                label="Allocated Payroll Amount"
                helper="Total payroll amount reserved by Finance."
              />
              <AixiaInputField
                value={editableForm.allocatedPayrollAmount}
                onChange={(event) =>
                  updateEditField("allocatedPayrollAmount", event.target.value)
                }
                disabled={actionLocked}
                inputMode="decimal"
                placeholder="0.00"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaDisplayBlock
                label="Pool Meaning"
                value="Reserve only"
                detail="No paycheck request selection and no payment distribution on this page."
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Payroll Funding Notes" />
              <AixiaTextareaField
                value={editableForm.notes}
                onChange={(event) => updateEditField("notes", event.target.value)}
                disabled={actionLocked}
                placeholder="Internal payroll funding pool notes"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        ) : (
          <AixiaFormGrid columns="three">
            <AixiaDisplayBlock label="Funding Pool Number" value={batch.batch_number} />
            <AixiaDisplayBlock
              label="Payroll Pool Total"
              value={`${currencyCode} ${formatMoney(allocatedPayrollAmount)}`}
              detail="Original payroll amount reserved by Finance."
            />
            <AixiaDisplayBlock
              label="Confirmed Used"
              value={`${currencyCode} ${formatMoney(confirmedUsedAmount)}`}
              detail="Only confirmed paycheck payment distributions count as used."
            />
            <AixiaDisplayBlock
              label="Remaining Balance"
              value={`${currencyCode} ${formatMoney(remainingPayrollFundingAmount)}`}
              detail={`${formatMoney(usagePercent)}% of this payroll funding pool has been used.`}
            />
            <AixiaDisplayBlock label="Payroll Period" value={payrollPeriodLabel} />
            <AixiaDisplayBlock
              label="Allocation Date"
              value={formatDate(batch.allocation_date)}
            />
            <AixiaDisplayBlock
              label="Funding Company"
              value={getCompanyName(fundingCompany)}
            />
            <AixiaDisplayBlock
              label="Funding Bank"
              value={getBankLabel(fundingBankAccount)}
            />
            <AixiaDisplayBlock label="Currency" value={batch.currency_code || "—"} />
            <AixiaDisplayBlock
              label="Status"
              value={<AixiaStatusBadge value={batch.status} />}
            />
            <AixiaDisplayBlock
              label="Documentation"
              value={<AixiaStatusBadge value={batch.documentation_status} />}
            />
            <AixiaDisplayBlock
              label="Created"
              value={formatDateTime(batch.created_at)}
              detail={`Updated ${formatDateTime(batch.updated_at)}`}
            />
            <AixiaDisplayBlock
              label="Pool Meaning"
              value="Reserve only — no paycheck payment distribution"
              detail="Paycheck matching and payment distribution happen later."
            />
            <AixiaDisplayBlock
              label="Proof"
              value={attachments.length > 0 ? "Attached" : "Not attached"}
              detail="Proof is required before confirming the payroll funding pool."
            />
            {batch.notes ? (
              <AixiaFormFullWidth>
                <AixiaDisplayBlock label="Notes" value={batch.notes} />
              </AixiaFormFullWidth>
            ) : null}
          </AixiaFormGrid>
        )}
      </AixiaSection>

      <AixiaSection
        title="Payroll Funding Proof"
        description="Files uploaded as proof that this payroll funding pool was approved, reserved, or transferred."
        icon={UploadCloud}
      >
        <AixiaDocumentUploadPanel
          selectedFile={fundingProofFile}
          attachments={uploadAttachments}
          required={isDraftPool}
          disabled={actionLocked || isArchivedOrDeleted}
          uploading={runningAction === "upload_proof"}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
          dropTitle="Drop payroll funding proof here"
          dropDescription="Upload bank confirmation, internal approval, payroll funding report, or reserve document."
          uploadLabel="Upload Proof"
          uploadingLabel="Uploading Proof..."
          emptyTitle="No payroll funding proof uploaded"
          emptyDescription="Upload proof before confirming this funding pool."
          requiredMessage="Payroll funding proof is required before this funding pool can be confirmed."
          onFileSelect={setFundingProofFile}
          onUpload={uploadFundingProof}
          onOpenAttachment={openFundingProofAttachment}
          onRemoveSelectedFile={() => setFundingProofFile(null)}
        />
      </AixiaSection>

      <AixiaSection
        title="Paycheck Payment Distributions"
        description="Confirmed and draft payment distributions that use this payroll funding pool."
        icon={WalletCards}
        actions={
          <AixiaRegistryToolbar
            search={null}
            primaryAction={
              isConfirmedPool && !isArchivedOrDeleted ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  disabled={actionLocked}
                  onClick={openPaycheckPaymentTool}
                >
                  {runningAction === "open_payment_tool" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <WalletCards className="h-4 w-4" />
                  )}
                  {runningAction === "open_payment_tool"
                    ? "Opening..."
                    : "Open Paycheck Payment Tool"}
                </AixiaButton>
              ) : null
            }
          />
        }
      >
        <DistributionTable
          rows={sortedEnrichedDistributions}
          currencyCode={currencyCode}
          sortKey={distributionSortKey}
          sortDirection={distributionSortDirection}
          onSort={handleDistributionSort}
          onOpen={(distributionId) =>
            navigate(`/finance/transactions/payroll/${distributionId}`)
          }
        />
      </AixiaSection>
    </>
  );

  const sideContent = (
    <>
      <AixiaSection
        title="Payroll Funding Actions"
        description="Confirm the pool, verify proof, refresh usage, or open the separate payment distribution tool."
        icon={ShieldCheck}
      >
        <AixiaActionStack>
          {isArchivedOrDeleted ? (
            <AixiaAlert tone="error">
              This payroll funding pool is archived, deleted, or cancelled. Normal
              actions are hidden.
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
              {runningAction === "confirm_pool" ? "Confirming..." : "Confirm Funding Pool"}
            </AixiaButton>
          ) : null}

          {!isDraftPool && isConfirmedPool ? (
            <AixiaAlert tone="success">
              This payroll funding pool is confirmed. It can now be used by the
              separate Paycheck Payment Distribution tool to distribute money
              across approved paycheck requests.
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

          <AixiaButton
            type="button"
            variant="secondary"
            disabled={actionLocked}
            onClick={() => void refreshUsage()}
          >
            {runningAction === "refresh_usage" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Clock3 className="h-4 w-4" />
            )}
            {runningAction === "refresh_usage" ? "Refreshing..." : "Refresh Usage"}
          </AixiaButton>

          {isConfirmedPool && !isArchivedOrDeleted ? (
            <AixiaButton
              type="button"
              variant="primary"
              disabled={actionLocked}
              onClick={openPaycheckPaymentTool}
            >
              {runningAction === "open_payment_tool" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <WalletCards className="h-4 w-4" />
              )}
              {runningAction === "open_payment_tool"
                ? "Opening..."
                : "Open Paycheck Payment Tool"}
            </AixiaButton>
          ) : null}

          {!isArchivedOrDeleted && isDraftPool && attachments.length === 0 ? (
            <AixiaAlert tone="info">
              Upload payroll funding proof before confirming this funding pool.
            </AixiaAlert>
          ) : null}
        </AixiaActionStack>
      </AixiaSection>

      <AixiaSection
        title="Status Summary"
        description="Current payroll funding pool state."
        icon={Clock3}
      >
        <AixiaFormGrid columns="one">
          <AixiaValueBlock
            label="Pool Status"
            value={<AixiaStatusBadge value={batch.status} />}
          />
          <AixiaValueBlock
            label="Documentation"
            value={<AixiaStatusBadge value={batch.documentation_status} />}
          />
          <AixiaValueBlock
            label="Payroll Pool Total"
            value={`${currencyCode} ${formatMoney(allocatedPayrollAmount)}`}
            detail="Period-based payroll money reserve."
          />
          <AixiaValueBlock
            label="Confirmed Used"
            value={`${currencyCode} ${formatMoney(confirmedUsedAmount)}`}
            detail="Confirmed paycheck payment distributions only."
          />
          <AixiaValueBlock
            label="Remaining Balance"
            value={`${currencyCode} ${formatMoney(remainingPayrollFundingAmount)}`}
            detail="Available for future paycheck payment distributions."
          />
          <AixiaValueBlock
            label="Payroll Period"
            value={payrollPeriodLabel}
            detail="Stored directly on the payroll funding batch."
          />
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Workflow Notes"
        description="The funding pool and payment distribution responsibilities stay separate."
        icon={Coins}
      >
        <AixiaFormGrid columns="one">
          <AixiaValueBlock
            label="Payroll Funding Pool"
            value="Reserve"
            detail="This record reserves a period-based payroll money pool from one company and optional bank account."
          />
          <AixiaValueBlock
            label="Paycheck Payment Distributions"
            value="Separate tool"
            detail="Actual distribution across approved paycheck requests happens only on the Paycheck Payment Distribution page."
          />
          <AixiaValueBlock
            label="No Paycheck Selection"
            value="Locked split"
            detail="This page does not select, match, or distribute money to individual paycheck requests."
          />
          <AixiaValueBlock
            label="Payroll Period"
            value="Directly stored"
            detail="Payroll Period From/To is stored directly on the funding batch so Finance can group monthly or custom-period payroll reserves."
          />
          <AixiaValueBlock
            label="Clean Split"
            value="Funding then distribution"
            detail="Payroll Funding Pool reserves money. Paycheck Payment Distributions distribute that money across approved paycheck requests."
          />
        </AixiaFormGrid>
      </AixiaSection>
    </>
  );

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Payroll"
        parentPath="/finance/transactions/payroll"
        badges={[
          { label: "Payroll Funding Pool Detail", tone: "violet" },
          { label: formatLabel(batch.status), tone: "emerald" },
          { label: formatLabel(batch.documentation_status), tone: "cyan" },
          ...(isRefreshing
            ? [{ label: "Syncing", tone: "neutral" as const }]
            : []),
        ]}
        gradientTitle="Payroll"
        title={batch.batch_number}
        description="This is a payroll reserve only. Paycheck matching and payment distribution happen later in the separate Paycheck Payment Distribution tool."
        statusCards={[
          {
            label: "Payroll Pool Total",
            value: `${currencyCode} ${formatMoney(allocatedPayrollAmount)}`,
            description: "Original payroll amount reserved by Finance.",
            icon: WalletCards,
            tone: "violet",
          },
          {
            label: "Confirmed Used",
            value: `${currencyCode} ${formatMoney(confirmedUsedAmount)}`,
            description:
              "Confirmed paycheck payment distributions already used from this pool.",
            icon: Banknote,
            tone: "emerald",
          },
          {
            label: "Remaining Balance",
            value: `${currencyCode} ${formatMoney(remainingPayrollFundingAmount)}`,
            description:
              "Available payroll funding pool balance for future distributions.",
            icon: ShieldCheck,
            tone: "cyan",
          },
          {
            label: "Payroll Period",
            value: payrollPeriodLabel,
            description: "The payroll period this pool should cover.",
            icon: CalendarDays,
            tone: "amber",
          },
        ]}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Payroll Pool Total"
          value={`${currencyCode} ${formatMoney(allocatedPayrollAmount)}`}
          description="Original payroll amount reserved by Finance."
          icon={WalletCards}
          tone="violet"
        />
        <AixiaMetricCard
          label="Confirmed Used"
          value={`${currencyCode} ${formatMoney(confirmedUsedAmount)}`}
          description="Confirmed distributions already used from this pool."
          icon={Banknote}
          tone="emerald"
        />
        <AixiaMetricCard
          label="Remaining Balance"
          value={`${currencyCode} ${formatMoney(remainingPayrollFundingAmount)}`}
          description="Available for future distributions."
          icon={ShieldCheck}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Linked Distributions"
          value={enrichedDistributions.length.toLocaleString()}
          description="Paycheck payment distributions connected to this pool."
          icon={WalletCards}
          tone="amber"
        />
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Locked access rule"
        description="Payroll funding pool detail records must use the shared AiXia registry-control and access-rule standard."
        icon={ShieldCheck}
      >
        Payroll funding pool detail records are financial registry/detail records. Linked Paycheck Payment Distributions must use AixiaRegistryToolbar for search/filter/action controls, sortable distribution columns, AixiaTableActionsCell row actions, protected backend RPCs for funding pool confirmation, proof verification, and usage refresh. Realtime plus 60-second fallback refresh must stay silent without resetting edits, visible records, or page state.
      </AixiaAccessRule>

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        sideRebalance="last-to-bottom"
        main={mainContent}
        side={sideContent}
      />
    </AixiaPage>
  );
}
