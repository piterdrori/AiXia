import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Receipt,
  Save,
  Search,
  Sparkles,
  UploadCloud,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type PaymentMode = "operating_expense" | "reimbursement";
type SaveMode = "draft" | "confirm";

type ExpenseRow = {
  id: string;
  expense_number: string | null;
  title: string;
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
  notes: string | null;
};

type FundingBatchLineRow = {
  id: string;
  funding_batch_id: string;
  expense_id: string;
  approved_amount: number | string | null;
  allocated_amount: number | string | null;
  currency_code: string | null;
  status: string;
};

type ExpenseAllocationDraft = {
  expenseId: string;
  amount: string;
};

type EnrichedExpense = ExpenseRow & {
  companyName: string;
  madeByLabel: string;
  targetAmount: number;
  defaultAllocationAmount: number;
  batchLineId: string | null;
  batchNumber: string | null;
};

type FormState = {
  paymentMode: PaymentMode;
  paymentDate: string;
  fundingCompanyId: string;
  paidFromBankAccountId: string;
  fundingBatchId: string;
  paymentCurrencyCode: string;
  referenceNumber: string;
  notes: string;
};

const initialFormState: FormState = {
  paymentMode: "reimbursement",
  paymentDate: new Date().toISOString().slice(0, 10),
  fundingCompanyId: "",
  paidFromBankAccountId: "",
  fundingBatchId: "",
  paymentCurrencyCode: "USD",
  referenceNumber: "",
  notes: "",
};

const statusToneMap: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  verified_for_payment: "emerald",
  approved_for_payment: "emerald",
  verified: "emerald",
  uploaded: "cyan",
  linked: "cyan",
  files_and_links: "cyan",
  missing: "rose",
  issue_found: "rose",
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
  draft: "slate",
  allocated_batch: "violet",
};

function buildReferenceNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

  return `PM-EXP-${datePart}-${randomPart}`;
}

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

function inputClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function textareaClass() {
  return "min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
}

function getEmployeeLabel(employee: EmployeeRefRow | null | undefined) {
  if (!employee) return "—";

  const role = employee.metadata?.job_title || employee.metadata?.source_role || employee.mark;
  const company = employee.metadata?.company;

  return [employee.code || "Employee", role, company].filter(Boolean).join(" • ");
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

function getExpenseMadeByLabel(
  expense: ExpenseRow,
  employeeMap: Map<string, EmployeeRefRow>
) {
  if (expense.expense_made_by_type === "employee" && expense.employee_ref_id) {
    return getEmployeeLabel(employeeMap.get(expense.employee_ref_id));
  }

  if (expense.expense_made_by_type === "owner_management") {
    return expense.responsible_person_name || "Owner / Management";
  }

  if (expense.expense_made_by_type === "company_direct") {
    return "Company Direct";
  }

  if (expense.expense_made_by_type === "other") {
    return expense.other_made_by_explanation || "Other";
  }

  return "—";
}

function getExpenseTargetAmount(expense: ExpenseRow) {
  return toNumber(
    expense.final_amount ||
      expense.approved_amount ||
      expense.requested_amount ||
      expense.amount
  );
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
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</div>
    </div>
  );
}

export default function FinanceExpensesPaymentsMadeNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialExpenseId = searchParams.get("expenseId") || "";
  const initialBatchId = searchParams.get("batchId") || "";

  const [form, setForm] = useState<FormState>({
    ...initialFormState,
    referenceNumber: buildReferenceNumber(),
    fundingBatchId: initialBatchId,
  });
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [fundingBatches, setFundingBatches] = useState<FundingBatchRow[]>([]);
  const [fundingBatchLines, setFundingBatchLines] = useState<FundingBatchLineRow[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>(
    initialExpenseId ? [initialExpenseId] : []
  );
  const [allocationDrafts, setAllocationDrafts] = useState<ExpenseAllocationDraft[]>([]);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee]));
  }, [employees]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((bank) => [bank.id, bank]));
  }, [bankAccounts]);

  const selectedFundingBatch = useMemo(() => {
    return fundingBatches.find((batch) => batch.id === form.fundingBatchId) || null;
  }, [form.fundingBatchId, fundingBatches]);

  const availableBankAccounts = useMemo(() => {
    if (!form.fundingCompanyId) return [];
    return bankAccounts.filter((bank) => bank.company_id === form.fundingCompanyId);
  }, [bankAccounts, form.fundingCompanyId]);

  const enrichedExpenses = useMemo<EnrichedExpense[]>(() => {
    return expenses.map((expense) => {
      const batchLine =
        form.fundingBatchId
          ? fundingBatchLines.find(
              (line) =>
                line.funding_batch_id === form.fundingBatchId &&
                line.expense_id === expense.id &&
                line.status !== "cancelled"
            )
          : null;

      const targetAmount = getExpenseTargetAmount(expense);

      return {
        ...expense,
        companyName: expense.company_id
          ? companyMap.get(expense.company_id)?.name || "Unknown company"
          : "No company",
        madeByLabel: getExpenseMadeByLabel(expense, employeeMap),
        targetAmount,
        defaultAllocationAmount: toNumber(batchLine?.allocated_amount || targetAmount),
        batchLineId: batchLine?.id || null,
        batchNumber: selectedFundingBatch?.batch_number || null,
      };
    });
  }, [companyMap, employeeMap, expenses, form.fundingBatchId, fundingBatchLines, selectedFundingBatch]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredExpenses = useMemo(() => {
    return enrichedExpenses.filter((expense) => {
      const isReady =
        expense.request_status === "verified_for_payment" ||
        expense.finance_review_status === "approved_for_payment";

      const isNotFullyCovered = expense.coverage_status !== "covered";

      if (!isReady || !isNotFullyCovered) return false;

      if (!normalizedSearch) return true;

      const content = [
        expense.expense_number,
        expense.title,
        expense.companyName,
        expense.madeByLabel,
        expense.expense_type,
        expense.expense_source_name,
        expense.documentation_status,
        expense.funding_status,
        expense.coverage_status,
        expense.online_platform,
        expense.online_order_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedExpenses, normalizedSearch]);

  const selectedExpenses = useMemo(() => {
    return enrichedExpenses.filter((expense) => selectedExpenseIds.includes(expense.id));
  }, [enrichedExpenses, selectedExpenseIds]);

  const totalAllocated = useMemo(() => {
    return allocationDrafts
      .filter((draft) => selectedExpenseIds.includes(draft.expenseId))
      .reduce((sum, draft) => sum + toNumber(draft.amount), 0);
  }, [allocationDrafts, selectedExpenseIds]);

  const selectedCurrency = form.paymentCurrencyCode || selectedExpenses[0]?.currency_code || "USD";

  const updateField = useCallback(
    <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
      setForm((current) => {
        const next = {
          ...current,
          [key]: value,
        };

        if (key === "fundingCompanyId") {
          next.paidFromBankAccountId = "";
        }

        return next;
      });

      setPageError(null);
      setPageMessage(null);
    },
    []
  );

  const loadOptions = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const [
        expensesResult,
        companiesResult,
        employeesResult,
        bankAccountsResult,
        fundingBatchesResult,
        fundingBatchLinesResult,
      ] = await Promise.all([
        supabase
          .from("finance_expenses")
          .select(
            [
              "id",
              "expense_number",
              "title",
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
          .order("updated_at", { ascending: false })
          .limit(500),

        supabase.from("finance_companies").select("id, name").order("name"),

        supabase
          .from("finance_employee_refs")
          .select("id, user_id, code, status, mark, metadata")
          .order("code"),

        supabase
          .from("finance_bank_accounts")
          .select(
            "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id, is_default"
          )
          .order("name"),

        supabase
          .from("finance_expense_funding_batches")
          .select(
            "id, batch_number, funding_company_id, funding_bank_account_id, allocation_date, currency_code, allocated_amount, status, documentation_status, notes"
          )
          .in("status", ["draft", "allocated"])
          .order("updated_at", { ascending: false })
          .limit(300),

        supabase
          .from("finance_expense_funding_batch_lines")
          .select(
            "id, funding_batch_id, expense_id, approved_amount, allocated_amount, currency_code, status"
          )
          .limit(1000),
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (employeesResult.error) throw employeesResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (fundingBatchesResult.error) throw fundingBatchesResult.error;
      if (fundingBatchLinesResult.error) throw fundingBatchLinesResult.error;

      const loadedExpenses = (expensesResult.data || []) as unknown as ExpenseRow[];
      const loadedBatches = (fundingBatchesResult.data || []) as FundingBatchRow[];
      const loadedBanks = (bankAccountsResult.data || []) as BankAccountRow[];

      setExpenses(loadedExpenses);
      setCompanies((companiesResult.data || []) as CompanyRow[]);
      setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
      setBankAccounts(loadedBanks);
      setFundingBatches(loadedBatches);
      setFundingBatchLines(
        (fundingBatchLinesResult.data || []) as FundingBatchLineRow[]
      );

      const initialBatch = initialBatchId
        ? loadedBatches.find((batch) => batch.id === initialBatchId)
        : null;

      if (initialBatch) {
        const defaultBank =
          initialBatch.funding_bank_account_id ||
          loadedBanks.find(
            (bank) => bank.company_id === initialBatch.funding_company_id && bank.is_default
          )?.id ||
          loadedBanks.find((bank) => bank.company_id === initialBatch.funding_company_id)?.id ||
          "";

        setForm((current) => ({
          ...current,
          fundingBatchId: initialBatch.id,
          fundingCompanyId: initialBatch.funding_company_id,
          paidFromBankAccountId: defaultBank,
          paymentCurrencyCode: initialBatch.currency_code || current.paymentCurrencyCode,
        }));
      }
    } catch (error) {
      console.error("Failed to load expense payment options:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to load payment options."
      );
    } finally {
      setIsLoading(false);
    }
  }, [initialBatchId]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (!form.fundingBatchId) return;

    const selectedBatch = fundingBatches.find((batch) => batch.id === form.fundingBatchId);
    if (!selectedBatch) return;

    const batchLines = fundingBatchLines.filter(
      (line) => line.funding_batch_id === selectedBatch.id && line.status !== "cancelled"
    );

    if (batchLines.length > 0 && selectedExpenseIds.length === 0) {
      setSelectedExpenseIds(batchLines.map((line) => line.expense_id));
    }

    setAllocationDrafts((current) => {
      const nextMap = new Map(current.map((item) => [item.expenseId, item.amount]));

      batchLines.forEach((line) => {
        if (!nextMap.has(line.expense_id)) {
          nextMap.set(line.expense_id, String(toNumber(line.allocated_amount)));
        }
      });

      return Array.from(nextMap.entries()).map(([expenseId, amount]) => ({
        expenseId,
        amount,
      }));
    });
  }, [form.fundingBatchId, fundingBatchLines, fundingBatches, selectedExpenseIds.length]);

  useEffect(() => {
    setAllocationDrafts((current) => {
      const nextMap = new Map(current.map((item) => [item.expenseId, item.amount]));

      selectedExpenses.forEach((expense) => {
        if (!nextMap.has(expense.id)) {
          nextMap.set(expense.id, String(expense.defaultAllocationAmount));
        }
      });

      return Array.from(nextMap.entries())
        .filter(([expenseId]) => selectedExpenseIds.includes(expenseId))
        .map(([expenseId, amount]) => ({
          expenseId,
          amount,
        }));
    });
  }, [selectedExpenseIds, selectedExpenses]);

  const toggleExpense = useCallback((expense: EnrichedExpense) => {
    setSelectedExpenseIds((current) => {
      if (current.includes(expense.id)) {
        return current.filter((id) => id !== expense.id);
      }

      return [...current, expense.id];
    });

    setAllocationDrafts((current) => {
      const exists = current.some((draft) => draft.expenseId === expense.id);

      if (exists) return current;

      return [
        ...current,
        {
          expenseId: expense.id,
          amount: String(expense.defaultAllocationAmount),
        },
      ];
    });

    setPageError(null);
    setPageMessage(null);
  }, []);

  const updateAllocationAmount = useCallback((expenseId: string, amount: string) => {
    setAllocationDrafts((current) => {
      const exists = current.some((draft) => draft.expenseId === expenseId);

      if (!exists) {
        return [...current, { expenseId, amount }];
      }

      return current.map((draft) =>
        draft.expenseId === expenseId ? { ...draft, amount } : draft
      );
    });

    setPageError(null);
    setPageMessage(null);
  }, []);

  const validateForm = useCallback(() => {
    if (!form.paymentDate) return "Payment date is required.";
    if (!form.fundingCompanyId) return "Funding company is required.";
    if (!form.paidFromBankAccountId) return "Paid-from bank account is required.";
    if (!form.paymentCurrencyCode.trim()) return "Payment currency is required.";
    if (selectedExpenseIds.length === 0) return "Select at least one expense.";
    if (totalAllocated <= 0) return "Allocated payment amount must be greater than zero.";

    const selectedBank = bankAccountMap.get(form.paidFromBankAccountId);

    if (!selectedBank) return "Selected bank account was not found.";

    if (selectedBank.company_id !== form.fundingCompanyId) {
      return "Paid-from bank account must belong to the funding company.";
    }

    const invalidAllocation = allocationDrafts
      .filter((draft) => selectedExpenseIds.includes(draft.expenseId))
      .find((draft) => toNumber(draft.amount) <= 0);

    if (invalidAllocation) return "Every selected expense must have an allocation amount.";

    return null;
  }, [
    allocationDrafts,
    bankAccountMap,
    form.fundingCompanyId,
    form.paidFromBankAccountId,
    form.paymentCurrencyCode,
    form.paymentDate,
    selectedExpenseIds,
    totalAllocated,
  ]);

  const uploadPaymentProof = useCallback(
    async (paymentId: string) => {
      if (!paymentProofFile) return null;

      const resolvedMimeType = resolveMimeType(paymentProofFile);
      const safeFileName = paymentProofFile.name.replace(/[^\w.\-]+/g, "_");
      const filePath = `${paymentId}/${Date.now()}-${safeFileName}`;

      const uploadResult = await supabase.storage
        .from("finance-payment-made-proofs")
        .upload(filePath, paymentProofFile, {
          contentType: resolvedMimeType,
          upsert: false,
        });

      if (uploadResult.error) throw uploadResult.error;

      return {
        bucket: "finance-payment-made-proofs",
        path: uploadResult.data.path,
        file_name: paymentProofFile.name,
        file_size: paymentProofFile.size,
        mime_type: resolvedMimeType,
        uploaded_at: new Date().toISOString(),
      };
    },
    [paymentProofFile]
  );

  const savePayment = useCallback(
    async (saveMode: SaveMode) => {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      try {
        const validationError = validateForm();

        if (validationError) {
          setPageError(validationError);
          return;
        }

        const authResult = await supabase.auth.getUser();
        if (authResult.error) throw authResult.error;

        const userId = authResult.data.user?.id ?? null;
        const selectedBank = bankAccountMap.get(form.paidFromBankAccountId);
        const referenceNumber = form.referenceNumber.trim() || buildReferenceNumber();

        const recipientNames = selectedExpenses
          .map((expense) => expense.madeByLabel)
          .filter(Boolean);

        const paymentInsertResult = await supabase
          .from("finance_payments_made")
          .insert({
            amount: totalAllocated,
            payment_date: form.paymentDate,
            status: "draft",
            reference_number: referenceNumber,
            vendor_id: null,
            bill_id: null,
            bank_account_id: form.paidFromBankAccountId,
            paid_from_bank_account_id: form.paidFromBankAccountId,
            paid_from_company_id: form.fundingCompanyId,
            notes: form.notes.trim() || null,
            payment_source_type: form.paymentMode,
            expense_funding_batch_id: form.fundingBatchId || null,
            recipient_employee_ref_id:
              selectedExpenses.length === 1 ? selectedExpenses[0]?.employee_ref_id || null : null,
            recipient_person_name:
              selectedExpenses.length === 1
                ? selectedExpenses[0]?.madeByLabel || null
                : `Multiple recipients (${recipientNames.length})`,
            recipient_confirmation_status: "not_required",
            payment_currency_code: form.paymentCurrencyCode.trim().toUpperCase(),
            converted_amount: totalAllocated,
            metadata: {
              source_area: "expenses_payments_made",
              selected_expense_ids: selectedExpenseIds,
              funding_company_name:
                companyMap.get(form.fundingCompanyId)?.name || null,
              paid_from_bank_label: getBankLabel(selectedBank),
            },
            created_by: userId,
            updated_by: userId,
          })
          .select("id")
          .single();

        if (paymentInsertResult.error) throw paymentInsertResult.error;

        const paymentId = paymentInsertResult.data.id as string;

        const proofMetadata = await uploadPaymentProof(paymentId);

        if (proofMetadata) {
          const proofUpdateResult = await supabase
            .from("finance_payments_made")
            .update({
              metadata: {
                source_area: "expenses_payments_made",
                selected_expense_ids: selectedExpenseIds,
                funding_company_name:
                  companyMap.get(form.fundingCompanyId)?.name || null,
                paid_from_bank_label: getBankLabel(selectedBank),
                payment_proof: proofMetadata,
              },
              updated_by: userId,
            })
            .eq("id", paymentId);

          if (proofUpdateResult.error) throw proofUpdateResult.error;
        }

        const allocationRows = allocationDrafts
          .filter((draft) => selectedExpenseIds.includes(draft.expenseId))
          .map((draft) => {
            const expense = selectedExpenses.find((item) => item.id === draft.expenseId);
            const amount = toNumber(draft.amount);

            if (!expense) {
              throw new Error("Selected expense was not found.");
            }

            return {
              payment_made_id: paymentId,
              expense_id: expense.id,
              funding_batch_id: form.fundingBatchId || null,
              funding_batch_line_id: expense.batchLineId,
              expense_company_id: expense.company_id,
              funding_company_id: form.fundingCompanyId,
              paid_from_bank_account_id: form.paidFromBankAccountId,
              recipient_employee_ref_id: expense.employee_ref_id,
              recipient_person_name: expense.madeByLabel,
              allocated_amount: amount,
              currency_code: expense.currency_code || form.paymentCurrencyCode,
              payment_currency_code: form.paymentCurrencyCode.trim().toUpperCase(),
              converted_amount: amount,
              recipient_confirmation_status: "pending_confirmation",
              metadata: {
                source_area: "expenses_payments_made",
                expense_number: expense.expense_number,
                expense_title: expense.title,
                payment_reference_number: referenceNumber,
              },
              created_by: userId,
              updated_by: userId,
            };
          });

        const allocationsResult = await supabase
          .from("finance_payment_made_expense_allocations")
          .insert(allocationRows);

        if (allocationsResult.error) throw allocationsResult.error;

        if (saveMode === "confirm") {
          const confirmResult = await supabase.rpc("finance_confirm_payment_made", {
            p_payment_id: paymentId,
          });

          if (confirmResult.error) throw confirmResult.error;
        }

        setPageMessage(
          saveMode === "confirm"
            ? "Payment Made created and confirmed."
            : "Payment Made draft created."
        );

        navigate("/finance/transactions/expenses-payments-made");
      } catch (error) {
        console.error("Failed to save expense payment:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to save expense payment."
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      allocationDrafts,
      bankAccountMap,
      companyMap,
      form,
      navigate,
      selectedExpenseIds,
      selectedExpenses,
      totalAllocated,
      uploadPaymentProof,
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
              onClick={() => navigate("/finance/transactions/expenses-payments-made")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Expenses Payments Made
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  New Expense Payment
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Create Payment Made / Reimbursement
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Select verified expenses, choose funding company and bank account, allocate
                  payment amounts, upload payment proof, then save draft or confirm the payment.
                </p>
              </div>

              <div className="grid gap-3">
                <SummaryBlock
                  title="Selected Expenses"
                  value={String(selectedExpenseIds.length)}
                  subtitle="Only verified and not fully covered expenses can be selected."
                />
                <SummaryBlock
                  title="Allocated Payment"
                  value={`${selectedCurrency} ${formatMoney(totalAllocated)}`}
                  subtitle="Total amount allocated across selected expense records."
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
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="flex items-start gap-4 border-b border-white/10 px-5 py-4">
                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                  <WalletCards className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Payment Setup
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    This page handles expense/reimbursement payments only.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className={labelClass()}>Payment Type</span>
                  <select
                    value={form.paymentMode}
                    onChange={(event) =>
                      updateField("paymentMode", event.target.value as PaymentMode)
                    }
                    className={inputClass()}
                  >
                    <option value="reimbursement">Reimbursement</option>
                    <option value="operating_expense">Operating Expense</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Payment Date</span>
                  <input
                    type="date"
                    value={form.paymentDate}
                    onChange={(event) => updateField("paymentDate", event.target.value)}
                    className={inputClass()}
                  />
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Funding Batch</span>
                  <select
                    value={form.fundingBatchId}
                    onChange={(event) => {
                      const batchId = event.target.value;
                      const batch = fundingBatches.find((item) => item.id === batchId);

                      setForm((current) => ({
                        ...current,
                        fundingBatchId: batchId,
                        fundingCompanyId: batch?.funding_company_id || current.fundingCompanyId,
                        paidFromBankAccountId:
                          batch?.funding_bank_account_id || current.paidFromBankAccountId,
                        paymentCurrencyCode:
                          batch?.currency_code || current.paymentCurrencyCode,
                      }));
                    }}
                    className={inputClass()}
                  >
                    <option value="">No batch / manual selection</option>
                    {fundingBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batch_number} •{" "}
                        {companyMap.get(batch.funding_company_id)?.name || "Company"} •{" "}
                        {formatMoney(batch.allocated_amount)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Funding Company</span>
                  <select
                    value={form.fundingCompanyId}
                    onChange={(event) =>
                      updateField("fundingCompanyId", event.target.value)
                    }
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
                  <span className={labelClass()}>Paid From Bank Account</span>
                  <select
                    value={form.paidFromBankAccountId}
                    onChange={(event) =>
                      updateField("paidFromBankAccountId", event.target.value)
                    }
                    className={inputClass()}
                    disabled={!form.fundingCompanyId}
                  >
                    <option value="">Select bank account</option>
                    {availableBankAccounts.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {getBankLabel(bank)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Payment Currency</span>
                  <input
                    value={form.paymentCurrencyCode}
                    onChange={(event) =>
                      updateField(
                        "paymentCurrencyCode",
                        event.target.value.toUpperCase().slice(0, 3)
                      )
                    }
                    className={inputClass()}
                    placeholder="USD"
                  />
                </label>

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Reference Number</span>
                  <input
                    value={form.referenceNumber}
                    onChange={(event) =>
                      updateField("referenceNumber", event.target.value)
                    }
                    className={inputClass()}
                    placeholder="Payment reference number"
                  />
                </label>

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Payment Notes</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    className={textareaClass()}
                    placeholder="Internal payment notes"
                  />
                </label>
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-emerald-200">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Select Expenses
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Choose verified expenses and allocate the payment amount.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 lg:w-[340px]"
                    placeholder="Search expenses..."
                  />
                </div>
              </div>

              <div className="p-5">
                {isLoading ? (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 px-6 py-12 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
                    <div className="mt-4 text-sm text-slate-400">
                      Loading verified expenses...
                    </div>
                  </div>
                ) : filteredExpenses.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                    <Receipt className="mx-auto h-8 w-8 text-slate-500" />
                    <div className="mt-4 text-sm font-semibold text-white">
                      No verified expenses found
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-500">
                      Expenses must be verified for payment before they can be paid.
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
                    <div className="max-h-[720px] overflow-y-auto">
                      <table className="w-full min-w-[1420px] border-collapse">
                        <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                          <tr>
                            <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Select
                            </th>
                            <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Expense
                            </th>
                            <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Company
                            </th>
                            <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Made By
                            </th>
                            <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Docs
                            </th>
                            <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Funding
                            </th>
                            <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Target
                            </th>
                            <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Allocation
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredExpenses.map((expense) => {
                            const isSelected = selectedExpenseIds.includes(expense.id);
                            const allocationValue =
                              allocationDrafts.find(
                                (draft) => draft.expenseId === expense.id
                              )?.amount || "";

                            return (
                              <tr
                                key={expense.id}
                                className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                              >
                                <td className="px-5 py-4">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleExpense(expense)}
                                    className="h-4 w-4 rounded border-white/20 bg-black/20"
                                  />
                                </td>

                                <td className="min-w-[240px] px-5 py-4">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(`/finance/transactions/expenses/${expense.id}`)
                                    }
                                    className="text-left font-semibold text-cyan-200 transition hover:text-cyan-100"
                                  >
                                    {expense.expense_number || "Expense"}
                                  </button>
                                  <div className="mt-1 text-xs text-white">
                                    {expense.title}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {formatDate(expense.expense_date)}
                                  </div>
                                </td>

                                <td className="min-w-[180px] px-5 py-4">
                                  {expense.companyName}
                                </td>

                                <td className="min-w-[220px] px-5 py-4">
                                  <div className="font-medium text-slate-200">
                                    {expense.madeByLabel}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {formatLabel(expense.expense_made_by_type)}
                                  </div>
                                </td>

                                <td className="whitespace-nowrap px-5 py-4">
                                  <StatusBadge value={expense.documentation_status} />
                                </td>

                                <td className="whitespace-nowrap px-5 py-4">
                                  <StatusBadge
                                    value={
                                      expense.batchLineId
                                        ? "allocated_batch"
                                        : expense.funding_status
                                    }
                                  />
                                  {expense.batchNumber ? (
                                    <div className="mt-1 text-xs text-slate-500">
                                      {expense.batchNumber}
                                    </div>
                                  ) : null}
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
                                  {expense.currency_code || selectedCurrency}{" "}
                                  {formatMoney(expense.targetAmount)}
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 text-right">
                                  <input
                                    value={allocationValue}
                                    onChange={(event) =>
                                      updateAllocationAmount(
                                        expense.id,
                                        event.target.value
                                      )
                                    }
                                    disabled={!isSelected}
                                    inputMode="decimal"
                                    className="h-10 w-[150px] rounded-2xl border border-white/10 bg-black/20 px-4 text-right text-sm text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-40 focus:border-cyan-400/30 focus:bg-black/30"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="sticky top-6 grid gap-6">
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Payment Summary
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Review before saving or confirming.
                </p>
              </div>

              <div className="grid gap-3 p-5">
                <SummaryBlock
                  title="Funding Company"
                  value={companyMap.get(form.fundingCompanyId)?.name || "Not selected"}
                  subtitle="The company allocating funds for this payment."
                />
                <SummaryBlock
                  title="Bank Account"
                  value={getBankLabel(bankAccountMap.get(form.paidFromBankAccountId))}
                  subtitle="The bank account used for the payment."
                />
                <SummaryBlock
                  title="Total Allocation"
                  value={`${selectedCurrency} ${formatMoney(totalAllocated)}`}
                  subtitle="Total payment amount allocated to selected expenses."
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-3 text-amber-200">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Payment Proof
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Optional now, but recommended before confirming.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-dashed border-white/15 bg-black/20 p-4">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                  onChange={(event) => setPaymentProofFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-100"
                />

                {paymentProofFile ? (
                  <div className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                    {paymentProofFile.name}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="grid gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void savePayment("confirm")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Create & Confirm Payment
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void savePayment("draft")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Draft
                </button>
              </div>

              <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4 text-xs leading-5 text-slate-500">
                Confirming calls <span className="text-slate-300">finance_confirm_payment_made</span>.
                Expense coverage updates from the allocation table automatically.
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <Banknote className="mt-0.5 h-5 w-5 text-cyan-200" />
                <div>
                  <div className="text-sm font-semibold text-white">
                    What this page does
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    It creates a Payment Made record, links it to selected expenses, allocates
                    amounts, stores proof metadata, and optionally confirms the payment.
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <FileCheck2 className="mt-0.5 h-5 w-5 text-emerald-200" />
                <div>
                  <div className="text-sm font-semibold text-white">
                    What this page does not do
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    It does not handle vendor bills, payroll, or other payment-made flows.
                    Those stay in their own pages.
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
