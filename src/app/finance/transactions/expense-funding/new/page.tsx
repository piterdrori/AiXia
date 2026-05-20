"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
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

import {
  AixiaAccessRule,
  AixiaActionCard,
  AixiaAlert,
  AixiaButton,
  AixiaDocumentUploadPanel,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaReviewGrid,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";
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
  fundingPeriodFrom: string;
  fundingPeriodTo: string;
  allocationDate: string;
  currencyCode: string;
  fundingPoolAmount: string;
  notes: string;
};

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonthStartIsoDate() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
}

function getCurrentMonthEndIsoDate() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
}

const initialFormState: FormState = {
  fundingCompanyId: "",
  fundingBankAccountId: "",
  fundingPeriodFrom: getCurrentMonthStartIsoDate(),
  fundingPeriodTo: getCurrentMonthEndIsoDate(),
  allocationDate: getTodayIsoDate(),
  currencyCode: "USD",
  fundingPoolAmount: "",
  notes: "",
};

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

function getCurrencyOptionLabel(currency: CurrencyRow) {
  const symbol = currency.currency_symbol ? ` (${currency.currency_symbol})` : "";
  const base = currency.is_base_currency ? " • Base" : "";
  return `${currency.currency_code} — ${currency.currency_name}${symbol}${base}`;
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

export default function FinanceExpenseFundingBatchNewPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(initialFormState);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [fundingProofFile, setFundingProofFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingMode, setSavingMode] = useState<SaveMode | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const selectedCurrency = normalizeCurrencyCode(form.currencyCode || "USD");
  const fundingPoolAmount = toNumber(form.fundingPoolAmount);

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

  const fundingPeriodLabel =
    form.fundingPeriodFrom && form.fundingPeriodTo
      ? `${formatDate(form.fundingPeriodFrom)} → ${formatDate(form.fundingPeriodTo)}`
      : "Not selected";

  const proofStatusLabel = fundingProofFile ? "Attached" : "Not Attached";
  const actionLocked = isLoading || isSaving;

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
      console.error("Failed to load funding pool setup:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to load funding pool setup."
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
      if (!form.fundingPeriodFrom) return "Funding period start date is required.";
      if (!form.fundingPeriodTo) return "Funding period end date is required.";
      if (form.fundingPeriodTo < form.fundingPeriodFrom) {
        return "Funding period end date cannot be before the start date.";
      }
      if (!selectedCurrency) return "Funding currency is required.";
      if (fundingPoolAmount <= 0) {
        return "Funding pool amount must be greater than zero.";
      }

      const selectedBank = form.fundingBankAccountId
        ? bankAccountMap.get(form.fundingBankAccountId)
        : null;

      if (selectedBank && selectedBank.company_id !== form.fundingCompanyId) {
        return "Funding bank account must belong to the funding company.";
      }

      if (saveMode === "allocated" && !fundingProofFile) {
        return "Funding proof document is required before creating a confirmed funding pool.";
      }

      return null;
    },
    [
      bankAccountMap,
      form.allocationDate,
      form.fundingBankAccountId,
      form.fundingCompanyId,
      form.fundingPeriodFrom,
      form.fundingPeriodTo,
      fundingPoolAmount,
      fundingProofFile,
      selectedCurrency,
    ]
  );

  const uploadFundingProof = useCallback(
    async (batchId: string) => {
      if (!fundingProofFile) return false;

      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const userId = authResult.data.user?.id ?? null;
      const resolvedMimeType = resolveMimeType(fundingProofFile);
      const safeFileName = fundingProofFile.name.replace(/[^\w.\-]+/g, "_");
      const filePath = `${batchId}/${Date.now()}-${safeFileName}`;

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
        entity_id: batchId,
        file_upload_id: fileUploadResult.data.id,
        uploaded_by: userId,
        notes: "Funding pool proof",
        metadata: {
          bucket: "finance-expense-funding-batch-documents",
          uploaded_from: "funding_pool_new_page",
          resolved_mime_type: resolvedMimeType,
        },
      });

      if (attachmentResult.error) throw attachmentResult.error;

      const documentationResult = await supabase.rpc(
        "finance_mark_expense_funding_batch_documentation",
        {
          p_batch_id: batchId,
          p_documentation_status: "uploaded",
          p_notes: "Funding pool proof uploaded.",
        }
      );

      if (documentationResult.error) throw documentationResult.error;

      return true;
    },
    [fundingProofFile]
  );

  const saveFundingBatch = useCallback(
    async (saveMode: SaveMode) => {
      if (isSaving) return;

      setIsSaving(true);
      setSavingMode(saveMode);
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
          `Funding pool amount: ${selectedCurrency} ${formatMoney(fundingPoolAmount)}`,
          `Funding period: ${form.fundingPeriodFrom} to ${form.fundingPeriodTo}`,
          "Funding pool type: monthly_or_period_reserve",
          "Control rule: no expense distribution on funding pool creation",
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
          throw new Error("Funding pool was created but no batch ID was returned.");
        }

        const updateResult = await supabase
          .from("finance_expense_funding_batches")
          .update({
            allocated_amount: fundingPoolAmount,
            metadata: {
              allocation_mode: "funding_pool_reserve",
              funding_pool_amount: fundingPoolAmount,
              funding_pool_currency: selectedCurrency,
              funding_period_from: form.fundingPeriodFrom,
              funding_period_to: form.fundingPeriodTo,
              created_from: "funding_pool_new_page",
              process_scope: "payment_execution_tools",
              expense_selection_allowed: false,
              expense_distribution_allowed: false,
            },
          })
          .eq("id", batchId);

        if (updateResult.error) throw updateResult.error;

        await uploadFundingProof(batchId);

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
            ? "Funding pool created and confirmed."
            : "Funding pool draft created."
        );

        navigate(`/finance/transactions/expense-funding/${batchId}`);
      } catch (error) {
        console.error("Failed to save funding pool:", error);
        setPageError(error instanceof Error ? error.message : "Failed to save funding pool.");
      } finally {
        setIsSaving(false);
        setSavingMode(null);
      }
    },
    [
      form.allocationDate,
      form.fundingBankAccountId,
      form.fundingCompanyId,
      form.fundingPeriodFrom,
      form.fundingPeriodTo,
      form.notes,
      fundingPoolAmount,
      isSaving,
      navigate,
      selectedCurrency,
      uploadFundingProof,
      validateForm,
    ]
  );

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading funding pool setup"
        description="Companies, bank accounts, and currency master data are being loaded."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Payment Control"
        parentPath="/finance/transactions/expense-funding"
        badges={[
          { label: "Funding Pool", tone: "cyan" },
          { label: "No Expense Selection", tone: "violet" },
          {
            label: fundingProofFile ? "Proof Ready" : "Proof Pending",
            tone: fundingProofFile ? "emerald" : "gold",
          },
        ]}
        gradientTitle="NEW FUNDING POOL"
        title=""
        subtitle="Create monthly or period funding pool"
        description="Reserve a pool of company money for a selected period. This page does not select expenses, distribute money, or connect this pool to one specific expense."
        statusCards={[
          {
            label: "Funding Pool",
            value: `${selectedCurrency} ${formatMoney(fundingPoolAmount)}`,
            description: "Total money Finance is reserving for the selected period.",
            icon: Coins,
            tone: fundingPoolAmount > 0 ? "emerald" : "neutral",
          },
          {
            label: "Funding Period",
            value: fundingPeriodLabel,
            description: "The operating-expense period this pool is intended to cover.",
            icon: CalendarDays,
            tone: form.fundingPeriodFrom && form.fundingPeriodTo ? "cyan" : "neutral",
          },
          {
            label: "Funding Proof",
            value: proofStatusLabel,
            description: "Proof is optional for draft and required before confirming.",
            icon: UploadCloud,
            tone: fundingProofFile ? "emerald" : "gold",
          },
        ]}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Funding Company"
          value={selectedCompanyName}
          description="The company reserving money."
          icon={Building2}
          tone={form.fundingCompanyId ? "cyan" : "neutral"}
        />
        <AixiaMetricCard
          label="Funding Bank"
          value={selectedBankLabel}
          description="Optional funding account reference."
          icon={Banknote}
          tone={form.fundingBankAccountId ? "violet" : "neutral"}
        />
        <AixiaMetricCard
          label="Funding Period"
          value={fundingPeriodLabel}
          description="The expense period this pool should cover."
          icon={CalendarDays}
          tone="gold"
        />
        <AixiaMetricCard
          label="Funding Pool"
          value={`${selectedCurrency} ${formatMoney(fundingPoolAmount)}`}
          description="Total internal money reserved."
          icon={WalletCards}
          tone={fundingPoolAmount > 0 ? "emerald" : "neutral"}
        />
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Locked funding pool creation rule"
        description="Funding pool creation must stay separate from expense selection and payment distribution."
        icon={ShieldCheck}
      >
        This page creates a period-based funding reserve only. Expense matching and
        payment distribution happen later from the Expense Payments tool. Draft can
        be saved without proof. Create Funding Pool requires proof and confirms the
        funding batch through the protected backend RPC.
      </AixiaAccessRule>

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        bottomSpan="never"
        sideRebalance="last-to-bottom"
        main={
          <>
            <AixiaSection
              title="Funding Pool Setup"
              description="Create a Finance reserve for a period. Expense matching and disbursement happen later on the Expense Payments page."
              icon={Archive}
            >
              <AixiaFormGrid columns="three">
                <AixiaFormField>
                  <AixiaFieldLabel label="Funding Company" />
                  <AixiaSelectField
                    value={form.fundingCompanyId}
                    onChange={(event) => updateField("fundingCompanyId", event.target.value)}
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
                    value={form.fundingBankAccountId}
                    onChange={(event) =>
                      updateField("fundingBankAccountId", event.target.value)
                    }
                    disabled={!form.fundingCompanyId || actionLocked}
                  >
                    <option value="">No bank selected</option>
                    {availableBankAccounts.map((bank) => (
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
                    value={form.allocationDate}
                    onChange={(event) => updateField("allocationDate", event.target.value)}
                    disabled={actionLocked}
                  />
                  <div className="aixia-helper-text">
                    The date Finance creates or approves this reserve.
                  </div>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Funding Period From" />
                  <AixiaInputField
                    type="date"
                    value={form.fundingPeriodFrom}
                    onChange={(event) =>
                      updateField("fundingPeriodFrom", event.target.value)
                    }
                    disabled={actionLocked}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Funding Period To" />
                  <AixiaInputField
                    type="date"
                    value={form.fundingPeriodTo}
                    onChange={(event) => updateField("fundingPeriodTo", event.target.value)}
                    disabled={actionLocked}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Funding Currency" />
                  <AixiaSelectField
                    value={selectedCurrency}
                    onChange={(event) => updateField("currencyCode", event.target.value)}
                    disabled={actionLocked}
                  >
                    <option value="">Select currency</option>
                    {currencyOptions.map((currency) => (
                      <option key={currency.id} value={currency.currency_code}>
                        {getCurrencyOptionLabel(currency)}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Funding Pool Amount" />
                  <AixiaInputField
                    value={form.fundingPoolAmount}
                    onChange={(event) =>
                      updateField("fundingPoolAmount", event.target.value)
                    }
                    inputMode="decimal"
                    placeholder="0.00"
                    disabled={actionLocked}
                  />
                  <div className="aixia-helper-text">
                    Total money reserved for this period.
                  </div>
                </AixiaFormField>

                <AixiaFormFullWidth>
                  <AixiaValueBlock
                    label="Pool Meaning"
                    value="Reserve only — no expense selection and no money distribution on this page"
                    detail="This pool is used later by Expense Payments to reimburse or pay many verified expenses."
                  />
                </AixiaFormFullWidth>

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Funding Notes" />
                  <AixiaTextareaField
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    placeholder="Internal funding notes, monthly context, approval reference, or reserve explanation"
                    disabled={actionLocked}
                  />
                </AixiaFormFullWidth>
              </AixiaFormGrid>
            </AixiaSection>

            <AixiaSection
              title="Funding Proof"
              description="Upload proof that this money pool was approved, reserved, or transferred. Required before creating a confirmed funding pool."
              icon={UploadCloud}
            >
              <AixiaDocumentUploadPanel
                selectedFile={fundingProofFile}
                attachments={[]}
                required
                disabled={actionLocked}
                uploading={savingMode === "allocated"}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                dropTitle="Drop funding proof here"
                dropDescription="Attach bank confirmation, internal approval, Finance allocation report, signed reserve document, or management approval."
                uploadLabel="Create Funding Pool"
                uploadingLabel="Creating Funding Pool..."
                selectedFileLabel="Selected funding proof"
                emptyTitle="No funding proof selected"
                emptyDescription="Proof is optional for draft and required for Create Funding Pool."
                requiredMessage="Funding proof is required before creating a confirmed funding pool."
                onFileSelect={(file) => {
                  setFundingProofFile(file);
                  setPageError(null);
                  setPageMessage(null);
                }}
                onRemoveSelectedFile={() => setFundingProofFile(null)}
                onUpload={() => void saveFundingBatch("allocated")}
              />
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Funding Pool Summary"
              description="Review the reserved money pool before saving."
              icon={Sparkles}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Funding Company"
                  value={selectedCompanyName}
                  detail="The company reserving money."
                />
                <AixiaValueBlock
                  label="Bank Account"
                  value={selectedBankLabel}
                  detail="Optional funding account reference."
                />
                <AixiaValueBlock
                  label="Funding Period"
                  value={fundingPeriodLabel}
                  detail="The expense period this pool should cover."
                />
                <AixiaValueBlock
                  label="Funding Pool"
                  value={`${selectedCurrency} ${formatMoney(fundingPoolAmount)}`}
                  detail="Total internal money reserved."
                />
                <AixiaValueBlock
                  label="Proof Status"
                  value={proofStatusLabel}
                  detail="Required before Create Funding Pool."
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Save Actions"
              description="Create the funding pool as a draft or create and confirm it with proof."
              icon={CheckCircle2}
            >
              <div className="aixia-stack">
                <AixiaButton
                  type="button"
                  variant="primary"
                  disabled={actionLocked}
                  onClick={() => void saveFundingBatch("allocated")}
                >
                  {savingMode === "allocated" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {savingMode === "allocated"
                    ? "Creating Funding Pool..."
                    : "Create Funding Pool"}
                </AixiaButton>

                <AixiaButton
                  type="button"
                  variant="secondary"
                  disabled={actionLocked}
                  onClick={() => void saveFundingBatch("draft")}
                >
                  {savingMode === "draft" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingMode === "draft" ? "Saving Draft..." : "Save Draft"}
                </AixiaButton>

                <AixiaAlert tone="info">
                  This creates a funding pool only. Expense matching and payment
                  distribution happen later from Expense Payments.
                </AixiaAlert>
              </div>
            </AixiaSection>

            <AixiaSection
              title="Operating Rules"
              description="Funding pool creation follows the clean split between reserve and payment distribution."
              icon={FileCheck2}
            >
              <div className="aixia-stack">
                <AixiaActionCard
                  label="Funding Pool"
                  value="Period-based reserve"
                  description="Reserve money from one company and optional bank account."
                  icon={Coins}
                  tone="cyan"
                />
                <AixiaActionCard
                  label="Expense Payments"
                  value="Distribution happens later"
                  description="Actual distribution across verified expenses happens later on the Expense Payments page."
                  icon={WalletCards}
                  tone="violet"
                />
                <AixiaActionCard
                  label="Control Rule"
                  value="Proof required for confirmation"
                  description="Draft can be saved without proof. Create Funding Pool requires proof."
                  icon={ShieldCheck}
                  tone="emerald"
                />
                <AixiaActionCard
                  label="No Expense Selection"
                  value="No matching on this page"
                  description="This page does not select, match, or distribute money to individual expenses."
                  icon={Building2}
                  tone="gold"
                />
                <AixiaActionCard
                  label="Funding Period"
                  value="Metadata controlled"
                  description="Funding Period From/To is stored in metadata for monthly or custom-period reserves."
                  icon={CalendarDays}
                  tone="neutral"
                />
                <AixiaActionCard
                  label="Backend"
                  value="RPC controlled"
                  description="Uses funding batch creation, proof documentation, mark allocated RPC, and period metadata."
                  icon={Banknote}
                  tone="neutral"
                />
              </div>
            </AixiaSection>
          </>
        }
      />
    </AixiaPage>
  );
}
