import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  Coins,
  FileCheck2,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type SaveMode = "draft" | "allocated";

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

type FormState = {
  fundingCompanyId: string;
  fundingBankAccountId: string;
  allocationDate: string;
  currencyCode: string;
  allocatedFundsAmount: string;
  notes: string;
};

const initialFormState: FormState = {
  fundingCompanyId: "",
  fundingBankAccountId: "",
  allocationDate: new Date().toISOString().slice(0, 10),
  currencyCode: "USD",
  allocatedFundsAmount: "",
  notes: "",
};

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
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

function inputClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function textareaClass() {
  return "min-h-[132px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
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

export default function FinanceExpenseFundingBatchNewPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(initialFormState);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [allocationProofFile, setAllocationProofFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const selectedCurrency = normalizeCurrencyCode(form.currencyCode || "USD");
  const allocatedFundsAmount = toNumber(form.allocatedFundsAmount);

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((bank) => [bank.id, bank]));
  }, [bankAccounts]);

  const availableBankAccounts = useMemo(() => {
    if (!form.fundingCompanyId) return [];
    return bankAccounts.filter((bank) => bank.company_id === form.fundingCompanyId);
  }, [bankAccounts, form.fundingCompanyId]);

  const currencyOptions = useMemo(() => {
    return currencies.filter((currency) => currency.status === "active");
  }, [currencies]);

  const selectedCompanyName =
    companyMap.get(form.fundingCompanyId)?.name || "Not selected";

  const selectedBankLabel = getBankLabel(bankAccountMap.get(form.fundingBankAccountId));

  const updateField = useCallback(
    <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
      setForm((current) => {
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

  const loadOptions = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const [companiesResult, bankAccountsResult, currenciesResult] = await Promise.all([
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
      ]);

      if (companiesResult.error) throw companiesResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (currenciesResult.error) throw currenciesResult.error;

      const loadedCompanies = (companiesResult.data || []) as CompanyRow[];
      const loadedBankAccounts = (bankAccountsResult.data || []) as BankAccountRow[];
      const loadedCurrencies = (currenciesResult.data || []) as unknown as CurrencyRow[];

      setCompanies(loadedCompanies);
      setBankAccounts(loadedBankAccounts);
      setCurrencies(loadedCurrencies);

      const initialCompanyId = loadedCompanies[0]?.id || "";
      const defaultBank =
        loadedBankAccounts.find((bank) => bank.company_id === initialCompanyId && bank.is_default)
          ?.id ||
        loadedBankAccounts.find((bank) => bank.company_id === initialCompanyId)?.id ||
        "";

      const defaultCurrency =
        loadedCurrencies.find((currency) => currency.is_base_currency)?.currency_code ||
        loadedCurrencies[0]?.currency_code ||
        "USD";

      setForm((current) => ({
        ...current,
        fundingCompanyId: current.fundingCompanyId || initialCompanyId,
        fundingBankAccountId: current.fundingBankAccountId || defaultBank,
        currencyCode: current.currencyCode || defaultCurrency,
      }));
    } catch (error) {
      console.error("Failed to load funding allocation setup:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to load funding allocation setup."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const validateForm = useCallback(
    (saveMode: SaveMode) => {
      if (!form.fundingCompanyId) return "Funding company is required.";
      if (!form.allocationDate) return "Allocation date is required.";
      if (!selectedCurrency) return "Funding currency is required.";
      if (allocatedFundsAmount <= 0) {
        return "Allocated funds amount must be greater than zero.";
      }

      const selectedBank = form.fundingBankAccountId
        ? bankAccountMap.get(form.fundingBankAccountId)
        : null;

      if (selectedBank && selectedBank.company_id !== form.fundingCompanyId) {
        return "Funding bank account must belong to the funding company.";
      }

      if (saveMode === "allocated" && !allocationProofFile) {
        return "Allocation proof document is required before marking funds allocated.";
      }

      return null;
    },
    [
      allocatedFundsAmount,
      allocationProofFile,
      bankAccountMap,
      form.allocationDate,
      form.fundingBankAccountId,
      form.fundingCompanyId,
      selectedCurrency,
    ]
  );

  const uploadAllocationProof = useCallback(
    async (batchId: string) => {
      if (!allocationProofFile) return false;

      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const userId = authResult.data.user?.id ?? null;
      const resolvedMimeType = resolveMimeType(allocationProofFile);
      const safeFileName = allocationProofFile.name.replace(/[^\w.\-]+/g, "_");
      const filePath = `${batchId}/${Date.now()}-${safeFileName}`;

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
        entity_id: batchId,
        file_upload_id: fileUploadResult.data.id,
        uploaded_by: userId,
        notes: "Funding allocation proof",
        metadata: {
          bucket: "finance-expense-funding-batch-documents",
          uploaded_from: "funding_allocation_new_page",
          resolved_mime_type: resolvedMimeType,
        },
      });

      if (attachmentResult.error) throw attachmentResult.error;

      const documentationResult = await supabase.rpc(
        "finance_mark_expense_funding_batch_documentation",
        {
          p_batch_id: batchId,
          p_documentation_status: "uploaded",
          p_notes: "Funding allocation proof uploaded.",
        }
      );

      if (documentationResult.error) throw documentationResult.error;

      return true;
    },
    [allocationProofFile]
  );

  const saveFundingBatch = useCallback(
    async (saveMode: SaveMode) => {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      try {
        const validationError = validateForm(saveMode);

        if (validationError) {
          setPageError(validationError);
          return;
        }

        const batchNotes = [
          form.notes.trim() || null,
          `Allocated funds amount: ${selectedCurrency} ${formatMoney(allocatedFundsAmount)}`,
          `Funding allocation type: lump_sum_reserve`,
        ]
          .filter(Boolean)
          .join("\n");

        const createResult = await supabase.rpc("finance_create_expense_funding_batch", {
          p_funding_company_id: form.fundingCompanyId,
          p_funding_bank_account_id: form.fundingBankAccountId || null,
          p_allocation_date: form.allocationDate,
          p_currency_code: selectedCurrency,
          p_notes: batchNotes,
        });

        if (createResult.error) throw createResult.error;

        const batchId = String(createResult.data || "");

        if (!batchId) {
          throw new Error("Funding batch was created but no batch ID was returned.");
        }

        const updateResult = await supabase
          .from("finance_expense_funding_batches")
          .update({
            allocated_amount: allocatedFundsAmount,
            metadata: {
              allocation_mode: "lump_sum_reserve",
              allocated_funds_amount: allocatedFundsAmount,
              allocated_funds_currency: selectedCurrency,
              created_from: "funding_allocation_new_page",
            },
          })
          .eq("id", batchId);

        if (updateResult.error) throw updateResult.error;

        await uploadAllocationProof(batchId);

        if (saveMode === "allocated") {
          const allocatedResult = await supabase.rpc(
            "finance_mark_expense_funding_batch_allocated",
            {
              p_batch_id: batchId,
            }
          );

          if (allocatedResult.error) throw allocatedResult.error;
        }

        setPageMessage(
          saveMode === "allocated"
            ? "Funding allocation created and marked allocated."
            : "Funding allocation draft created."
        );

        navigate(`/finance/transactions/expenses-payments-made/funding-batches/${batchId}`);
      } catch (error) {
        console.error("Failed to save funding allocation:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to save funding allocation."
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      allocatedFundsAmount,
      form.allocationDate,
      form.fundingBankAccountId,
      form.fundingCompanyId,
      form.notes,
      navigate,
      selectedCurrency,
      uploadAllocationProof,
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
              Operating Expense Payments
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  New Funding Allocation
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Create Funding Allocation Batch
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Reserve internal funds from a selected company and bank account. This page
                  does not distribute funds to expenses.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryBlock
                  title="Allocated Funds"
                  value={`${selectedCurrency} ${formatMoney(allocatedFundsAmount)}`}
                  subtitle="Total money Finance is reserving in this batch."
                />
                <SummaryBlock
                  title="Allocation Type"
                  value="Lump Sum"
                  subtitle="Distribution to expenses happens later in payment execution."
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
                <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200">
                  <Archive className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Funding Allocation Setup
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Pure fund reserve. No expense selection happens on this page.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-3">
                <label className="grid gap-2">
                  <span className={labelClass()}>Funding Company</span>
                  <select
                    value={form.fundingCompanyId}
                    onChange={(event) =>
                      updateField("fundingCompanyId", event.target.value)
                    }
                    className={inputClass()}
                    disabled={isLoading}
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
                    value={form.fundingBankAccountId}
                    onChange={(event) =>
                      updateField("fundingBankAccountId", event.target.value)
                    }
                    disabled={!form.fundingCompanyId || isLoading}
                    className={inputClass()}
                  >
                    <option value="">No bank selected</option>
                    {availableBankAccounts.map((bank) => (
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
                    value={form.allocationDate}
                    onChange={(event) =>
                      updateField("allocationDate", event.target.value)
                    }
                    className={inputClass()}
                    disabled={isLoading}
                  />
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Funding Currency</span>
                  <select
                    value={selectedCurrency}
                    onChange={(event) => updateField("currencyCode", event.target.value)}
                    className={inputClass()}
                    disabled={isLoading}
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
                  <span className={labelClass()}>Allocated Funds Amount</span>
                  <input
                    value={form.allocatedFundsAmount}
                    onChange={(event) =>
                      updateField("allocatedFundsAmount", event.target.value)
                    }
                    inputMode="decimal"
                    placeholder="0.00"
                    className={inputClass()}
                    disabled={isLoading}
                  />
                  <span className="text-xs leading-5 text-slate-500">
                    Total funds reserved by Finance.
                  </span>
                </label>

                <div className="grid gap-2">
                  <span className={labelClass()}>Allocation Meaning</span>
                  <div className="flex h-11 items-center rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100">
                    Reserve only — no expense distribution
                  </div>
                  <span className="text-xs leading-5 text-slate-500">
                    Expense matching happens later.
                  </span>
                </div>

                <label className="grid gap-2 md:col-span-3">
                  <span className={labelClass()}>Funding Notes</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    className={textareaClass()}
                    placeholder="Internal allocation notes"
                    disabled={isLoading}
                  />
                </label>
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="flex items-start gap-4 border-b border-white/10 px-5 py-4">
                <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-3 text-amber-200">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Allocation Proof
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Upload proof that funds were reserved or allocated. Required before
                    marking allocated.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
                <div className="rounded-[24px] border border-dashed border-white/15 bg-black/20 p-5">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                    onChange={(event) =>
                      setAllocationProofFile(event.target.files?.[0] ?? null)
                    }
                    className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-violet-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-violet-100"
                  />

                  {allocationProofFile ? (
                    <div className="mt-4 rounded-2xl border border-violet-400/15 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
                      {allocationProofFile.name}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-amber-400/15 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                      Proof is optional for draft and required for allocated status.
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Document Purpose
                  </div>
                  <div className="mt-3 text-sm font-semibold leading-6 text-white">
                    Proof of internal money allocation
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-400">
                    This can be a bank confirmation, internal approval, finance allocation
                    report, or signed reserve document.
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="sticky top-6 grid gap-6">
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Allocation Summary
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Review reserved funds before saving.
                </p>
              </div>

              <div className="grid gap-3 p-5">
                <SummaryBlock
                  title="Funding Company"
                  value={selectedCompanyName}
                  subtitle="The company reserving money."
                />
                <SummaryBlock
                  title="Bank Account"
                  value={selectedBankLabel}
                  subtitle="Optional funding account reference."
                />
                <SummaryBlock
                  title="Allocated Funds"
                  value={`${selectedCurrency} ${formatMoney(allocatedFundsAmount)}`}
                  subtitle="Total internal money reserved."
                />
                <SummaryBlock
                  title="Proof Status"
                  value={allocationProofFile ? "Attached" : "Not Attached"}
                  subtitle="Required before Create & Mark Allocated."
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="grid gap-3">
                <button
                  type="button"
                  disabled={isSaving || isLoading}
                  onClick={() => void saveFundingBatch("allocated")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Create & Mark Allocated
                </button>

                <button
                  type="button"
                  disabled={isSaving || isLoading}
                  onClick={() => void saveFundingBatch("draft")}
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
                This creates a funding reserve only. Expense distribution happens later
                from Operating Expense Payment execution.
              </div>
            </section>

            <InfoCard icon={Coins} title="Funding Allocation">
              Reserve a lump sum of internal funds from one company and optional bank
              account.
            </InfoCard>

            <InfoCard icon={WalletCards} title="Payment Execution">
              Actual payment and expense matching happen on the New Operating Expense
              Payment page.
            </InfoCard>

            <InfoCard icon={ShieldCheck} title="Control Rule">
              Draft can be saved without proof. Mark Allocated requires proof.
            </InfoCard>

            <InfoCard icon={Building2} title="No Expense Selection">
              This page does not select or distribute money to expenses.
            </InfoCard>

            <InfoCard icon={CalendarDays} title="Audit Context">
              Allocation date, company, bank, currency, amount, and proof are stored for
              finance review.
            </InfoCard>

            <InfoCard icon={Banknote} title="Backend">
              Uses funding batch creation, proof documentation, and mark allocated RPCs
              only.
            </InfoCard>

            <InfoCard icon={FileCheck2} title="Clean Split">
              Funding Allocation reserves funds. Operating Expense Payment distributes
              funds against expenses.
            </InfoCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
