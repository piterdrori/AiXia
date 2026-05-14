import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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
  AixiaActionCard,
  AixiaActionStack,
  AixiaAlert,
  AixiaBadge,
  AixiaButton,
  AixiaDisplayBlock,
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
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaTextareaField,
  AixiaValueBlock,
  type AixiaDocumentUploadAttachment,
} from "@/components/aixia";
import { supabase } from "@/lib/supabase";

type SaveMode = "draft" | "confirmed";

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

type FormState = {
  fundingCompanyId: string;
  fundingBankAccountId: string;
  payrollPeriodFrom: string;
  payrollPeriodTo: string;
  allocationDate: string;
  currencyCode: string;
  allocatedPayrollAmount: string;
  notes: string;
};

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonthStartIsoDate() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
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
  payrollPeriodFrom: getCurrentMonthStartIsoDate(),
  payrollPeriodTo: getCurrentMonthEndIsoDate(),
  allocationDate: getTodayIsoDate(),
  currencyCode: "USD",
  allocatedPayrollAmount: "",
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

function getCompanyName(company: CompanyRow | null | undefined) {
  if (!company) return "Not selected";
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

export default function FinancePayrollFundingBatchNewPage() {
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
  const allocatedPayrollAmount = toNumber(form.allocatedPayrollAmount);

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

  const selectedCompanyName = getCompanyName(companyMap.get(form.fundingCompanyId));
  const selectedBankLabel = getBankLabel(bankAccountMap.get(form.fundingBankAccountId));

  const payrollPeriodLabel =
    form.payrollPeriodFrom && form.payrollPeriodTo
      ? `${formatDate(form.payrollPeriodFrom)} → ${formatDate(form.payrollPeriodTo)}`
      : "Not selected";

  const uploadAttachments = useMemo<AixiaDocumentUploadAttachment[]>(() => {
    return fundingProofFile
      ? [
          {
            id: fundingProofFile.name,
            fileName: fundingProofFile.name,
            badge: "Selected",
            sizeLabel: `${(fundingProofFile.size / 1024 / 1024).toFixed(2)} MB`,
            description: "This proof file will be uploaded after the funding pool is saved.",
          },
        ]
      : [];
  }, [fundingProofFile]);

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
    [bankAccounts],
  );

  const loadOptions = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const [companiesResult, bankAccountsResult, currenciesResult] = await Promise.all([
        supabase.from("finance_companies").select("id, name, legal_name").order("name"),
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
      console.error("Failed to load payroll funding pool setup:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to load payroll funding pool setup.",
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
      if (!form.payrollPeriodFrom) return "Payroll period start date is required.";
      if (!form.payrollPeriodTo) return "Payroll period end date is required.";

      if (form.payrollPeriodTo < form.payrollPeriodFrom) {
        return "Payroll period end date cannot be before the start date.";
      }

      if (!selectedCurrency) return "Funding currency is required.";

      if (allocatedPayrollAmount <= 0) {
        return "Allocated payroll amount must be greater than zero.";
      }

      const selectedBank = form.fundingBankAccountId
        ? bankAccountMap.get(form.fundingBankAccountId)
        : null;

      if (selectedBank && selectedBank.company_id !== form.fundingCompanyId) {
        return "Funding bank account must belong to the funding company.";
      }

      if (saveMode === "confirmed" && !fundingProofFile) {
        return "Payroll funding proof is required before confirming a payroll funding pool.";
      }

      return null;
    },
    [
      allocatedPayrollAmount,
      bankAccountMap,
      form.allocationDate,
      form.fundingBankAccountId,
      form.fundingCompanyId,
      form.payrollPeriodFrom,
      form.payrollPeriodTo,
      fundingProofFile,
      selectedCurrency,
    ],
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

      const attachmentResult = await supabase.from("finance_record_attachments").insert({
        entity_type: "finance_paycheck_funding_batch",
        entity_id: batchId,
        file_upload_id: fileUploadResult.data.id,
        uploaded_by: userId,
        notes: "Payroll funding pool proof",
        metadata: {
          bucket: "finance-paycheck-funding-batch-documents",
          uploaded_from: "payroll_funding_pool_new_page",
          resolved_mime_type: resolvedMimeType,
        },
      });

      if (attachmentResult.error) throw attachmentResult.error;

      const documentationResult = await supabase.rpc(
        "finance_mark_paycheck_funding_batch_documentation",
        {
          p_batch_id: batchId,
          p_documentation_status: "uploaded",
          p_notes: "Payroll funding proof uploaded.",
        },
      );

      if (documentationResult.error) throw documentationResult.error;

      return true;
    },
    [fundingProofFile],
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

        const authResult = await supabase.auth.getUser();
        if (authResult.error) throw authResult.error;

        const actorUserId = authResult.data.user?.id ?? null;

        const insertResult = await supabase
          .from("finance_paycheck_funding_batches")
          .insert({
            funding_company_id: form.fundingCompanyId,
            funding_bank_account_id: form.fundingBankAccountId || null,
            allocation_date: form.allocationDate,
            period_start: form.payrollPeriodFrom,
            period_end: form.payrollPeriodTo,
            currency_code: selectedCurrency,
            allocated_amount: allocatedPayrollAmount,
            status: "draft",
            documentation_status: "missing",
            notes: form.notes.trim() || null,
            metadata: {
              allocation_mode: "payroll_funding_pool_reserve",
              allocated_payroll_amount: allocatedPayrollAmount,
              funding_pool_currency: selectedCurrency,
              payroll_period_from: form.payrollPeriodFrom,
              payroll_period_to: form.payrollPeriodTo,
              created_from: "payroll_funding_pool_new_page",
              process_scope: "paycheck_payment_execution_tools",
              paycheck_selection_allowed: false,
              paycheck_distribution_allowed: false,
            },
            created_by: actorUserId,
            updated_by: actorUserId,
          })
          .select("id")
          .single();

        if (insertResult.error) throw insertResult.error;

        const batchId = String(insertResult.data?.id || "");

        if (!batchId) {
          throw new Error("Payroll funding pool was created but no batch ID was returned.");
        }

        await uploadFundingProof(batchId);

        if (saveMode === "confirmed") {
          const confirmedResult = await supabase.rpc("finance_confirm_paycheck_funding_batch", {
            p_batch_id: batchId,
          });

          if (confirmedResult.error) throw confirmedResult.error;
        }

        setPageMessage(
          saveMode === "confirmed"
            ? "Payroll funding pool created and confirmed."
            : "Payroll funding pool draft created.",
        );

        navigate(`/finance/transactions/payroll/funding-batches/${batchId}`);
      } catch (error) {
        console.error("Failed to save payroll funding pool:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to save payroll funding pool.",
        );
      } finally {
        setIsSaving(false);
        setSavingMode(null);
      }
    },
    [
      allocatedPayrollAmount,
      form.allocationDate,
      form.fundingBankAccountId,
      form.fundingCompanyId,
      form.notes,
      form.payrollPeriodFrom,
      form.payrollPeriodTo,
      isSaving,
      navigate,
      selectedCurrency,
      uploadFundingProof,
      validateForm,
    ],
  );

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading payroll funding pool setup"
        description="Companies, bank accounts, and currencies are being loaded."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Payroll"
        parentPath="/finance/transactions/payroll"
        badges={[
          { label: "New Payroll Funding Pool", tone: "violet" },
          { label: "Reserve Only", tone: "cyan" },
          { label: fundingProofFile ? "Proof Attached" : "Proof Optional For Draft", tone: fundingProofFile ? "emerald" : "amber" },
        ]}
        gradientTitle="Create"
        title="Payroll Funding Pool"
        subtitle="Payroll reserve setup"
        description="Reserve a payroll money pool for a selected payroll period. This page does not select paycheck requests, distribute money, or connect this pool to one specific paycheck."
        statusCards={[
          {
            label: "Payroll Funding Pool",
            value: `${selectedCurrency} ${formatMoney(allocatedPayrollAmount)}`,
            description: "Total payroll money Finance is reserving for the selected period.",
            icon: WalletCards,
            tone: "violet",
          },
          {
            label: "Payroll Period",
            value: payrollPeriodLabel,
            description: "The payroll period this pool is intended to cover.",
            icon: CalendarDays,
            tone: "amber",
          },
        ]}

      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Funding Company"
          value={selectedCompanyName}
          description="The company reserving payroll money."
          icon={Building2}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Funding Bank"
          value={selectedBankLabel}
          description="Optional funding account reference."
          icon={Banknote}
          tone="emerald"
        />
        <AixiaMetricCard
          label="Payroll Pool"
          value={`${selectedCurrency} ${formatMoney(allocatedPayrollAmount)}`}
          description="Total internal payroll money reserved."
          icon={WalletCards}
          tone="violet"
        />
        <AixiaMetricCard
          label="Proof Status"
          value={fundingProofFile ? "Attached" : "Not Attached"}
          description="Required before Confirm Funding Pool."
          icon={UploadCloud}
          tone={fundingProofFile ? "emerald" : "amber"}
        />
      </AixiaMetricGrid>

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        sideRebalance="last-to-bottom"
        main={
          <>
            <AixiaSection
              title="Payroll Funding Pool Setup"
              description="Create a Finance reserve for payroll. Paycheck matching and distribution happen later on the Paycheck Payment Distributions page."
              icon={Sparkles}
            >
              <AixiaAlert tone="info">
                This creates a payroll funding pool only. Paycheck request matching and payment distribution happen later from Paycheck Payment Distributions.
              </AixiaAlert>

              <AixiaFormGrid columns="three">
                <AixiaFormField>
                  <AixiaFieldLabel label="Funding Company" />
                  <AixiaSelectField
                    value={form.fundingCompanyId}
                    onChange={(event) => updateField("fundingCompanyId", event.target.value)}
                    disabled={isLoading || isSaving}
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
                    value={form.fundingBankAccountId}
                    onChange={(event) => updateField("fundingBankAccountId", event.target.value)}
                    disabled={!form.fundingCompanyId || isLoading || isSaving}
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
                  <AixiaFieldLabel
                    label="Allocation Date"
                    helper="The date Finance creates or approves this payroll reserve."
                  />
                  <AixiaInputField
                    type="date"
                    value={form.allocationDate}
                    onChange={(event) => updateField("allocationDate", event.target.value)}
                    disabled={isLoading || isSaving}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Payroll Period From" />
                  <AixiaInputField
                    type="date"
                    value={form.payrollPeriodFrom}
                    onChange={(event) => updateField("payrollPeriodFrom", event.target.value)}
                    disabled={isLoading || isSaving}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Payroll Period To" />
                  <AixiaInputField
                    type="date"
                    value={form.payrollPeriodTo}
                    onChange={(event) => updateField("payrollPeriodTo", event.target.value)}
                    disabled={isLoading || isSaving}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Funding Currency" />
                  <AixiaSelectField
                    value={selectedCurrency}
                    onChange={(event) => updateField("currencyCode", event.target.value)}
                    disabled={isLoading || isSaving}
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
                    helper="Total payroll money reserved for this period."
                  />
                  <AixiaInputField
                    value={form.allocatedPayrollAmount}
                    onChange={(event) =>
                      updateField("allocatedPayrollAmount", event.target.value)
                    }
                    disabled={isLoading || isSaving}
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
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    placeholder="Internal payroll funding notes, monthly context, approval reference, or reserve explanation"
                    disabled={isLoading || isSaving}
                  />
                </AixiaFormFullWidth>
              </AixiaFormGrid>
            </AixiaSection>

            <AixiaSection
              title="Payroll Funding Proof"
              description="Upload proof that this payroll money pool was approved, reserved, or transferred. Required before confirming a funding pool."
              icon={UploadCloud}
              badge={
                fundingProofFile ? (
                  <AixiaBadge tone="emerald">Selected</AixiaBadge>
                ) : (
                  <AixiaBadge tone="amber">Optional For Draft</AixiaBadge>
                )
              }
            >
              <AixiaDocumentUploadPanel
                selectedFile={fundingProofFile}
                attachments={uploadAttachments}
                required={false}
                disabled={isLoading || isSaving}
                uploading={isSaving}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                dropTitle="Drop payroll funding proof here"
                dropDescription="Upload bank confirmation, internal approval, payroll funding report, signed payroll reserve document, or management approval."
                uploadLabel="Save Draft With Proof"
                uploadingLabel="Saving..."
                emptyTitle="No payroll funding proof selected"
                emptyDescription="Proof is optional for draft and required for Confirm Funding Pool."
                onFileSelect={setFundingProofFile}
                onUpload={() => void saveFundingBatch("draft")}
                onOpenAttachment={() => undefined}
                onRemoveSelectedFile={() => setFundingProofFile(null)}
              />
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Payroll Funding Summary"
              description="Review the reserved payroll money pool before saving."
              icon={WalletCards}
            >
              <AixiaActionStack>
                <AixiaButton
                  type="button"
                  variant="primary"
                  disabled={isSaving || isLoading}
                  onClick={() => void saveFundingBatch("confirmed")}
                >
                  {savingMode === "confirmed" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {savingMode === "confirmed" ? "Confirming..." : "Confirm Funding Pool"}
                </AixiaButton>
                <AixiaButton
                  type="button"
                  variant="secondary"
                  disabled={isSaving || isLoading}
                  onClick={() => void saveFundingBatch("draft")}
                >
                  {savingMode === "draft" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingMode === "draft" ? "Saving..." : "Save Draft"}
                </AixiaButton>
              </AixiaActionStack>

              <AixiaFormGrid columns="one">
                <AixiaValueBlock
                  label="Funding Company"
                  value={selectedCompanyName}
                  detail="The company reserving payroll money."
                />
                <AixiaValueBlock
                  label="Bank Account"
                  value={selectedBankLabel}
                  detail="Optional funding account reference."
                />
                <AixiaValueBlock
                  label="Payroll Period"
                  value={payrollPeriodLabel}
                  detail="The paycheck period this pool should cover."
                />
                <AixiaValueBlock
                  label="Payroll Pool"
                  value={`${selectedCurrency} ${formatMoney(allocatedPayrollAmount)}`}
                  detail="Total internal payroll money reserved."
                />
                <AixiaValueBlock
                  label="Proof Status"
                  value={fundingProofFile ? "Attached" : "Not Attached"}
                  detail="Required before Confirm Funding Pool."
                />
              </AixiaFormGrid>
            </AixiaSection>

            <AixiaSection
              title="Workflow Rules"
              description="Funding pool creation rules and clean workflow split."
              icon={ShieldCheck}
            >
              <AixiaFormGrid columns="one">
                <AixiaActionCard
                  label="Payroll Funding Pool"
                  value="Reserve"
                  description="Reserve a period-based payroll money pool from one company and optional bank account."
                  icon={Coins}
                  tone="violet"
                />
                <AixiaActionCard
                  label="Paycheck Payment Distributions"
                  value="Separate tool"
                  description="Actual distribution across approved paycheck requests happens later on the Paycheck Payment Distributions page."
                  icon={WalletCards}
                  tone="cyan"
                />
                <AixiaActionCard
                  label="Control Rule"
                  value="Draft first"
                  description="Draft can be saved without proof. Confirm Funding Pool requires proof."
                  icon={ShieldCheck}
                  tone="emerald"
                />
                <AixiaActionCard
                  label="No Paycheck Selection"
                  value="Locked split"
                  description="This page does not select, match, or distribute money to individual paycheck requests."
                  icon={Building2}
                  tone="amber"
                />
                <AixiaActionCard
                  label="Backend"
                  value="Funding batch"
                  description="Uses finance_paycheck_funding_batches, payroll funding proof upload, documentation RPC, and funding confirmation RPC."
                  icon={FileCheck2}
                  tone="neutral"
                />
              </AixiaFormGrid>
            </AixiaSection>
          </>
        }
      />
    </AixiaPage>
  );
}
