import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Landmark,
  ReceiptText,
  Save,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { supabase } from "@/lib/supabase";

type PayrollPeriodRow = {
  id: string;
  period_number: string | null;
  period_name: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: string;
};

type BankAccountRow = {
  id: string;
  code: string | null;
  name: string;
  account_type: string;
  institution_name: string | null;
  masked_account_number: string | null;
  status: string;
  beneficiary_name: string | null;
  currency_code: string | null;
  swift_code: string | null;
  iban: string | null;
  bank_name: string | null;
  company_id: string | null;
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

type ApprovedPaycheckRequestRow = {
  id: string;
  request_number: string | null;
  employee_ref_id: string;
  employee_user_id: string;
  requested_currency_code: string;
  requested_net_amount: number | string | null;
  status: string;
  review_status: string;
  period_start: string;
  period_end: string;
};

type FormState = {
  payrollPeriodId: string;
  basketName: string;
  fundingBankAccountId: string;
  fundingCurrencyCode: string;
  allocatedFundingAmount: string;
  allocatedFundingDate: string;
  allocationReference: string;
  allocationNotes: string;
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

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

function formatCount(value: number) {
  return value.toLocaleString();
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
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function inputClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function textareaClass() {
  return "min-h-[132px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
}

function getBankAccountLabel(row: BankAccountRow | null | undefined) {
  if (!row) return "Select funding bank account";

  const bankName = row.bank_name || row.institution_name || row.name;
  const currency = row.currency_code || "No currency";

  return [bankName, row.masked_account_number, currency].filter(Boolean).join(" • ");
}

function getBankIdentifier(row: BankAccountRow | null | undefined) {
  if (!row) return "—";
  if (row.iban) return `IBAN ${row.iban}`;
  if (row.swift_code) return `SWIFT ${row.swift_code}`;
  if (row.masked_account_number) return row.masked_account_number;
  return row.code || "No bank identifier";
}

function getPeriodLabel(row: PayrollPeriodRow | null | undefined) {
  if (!row) return "Select payroll period";

  return [
    row.period_name || row.period_number || "Payroll Period",
    `${formatDate(row.period_start)} → ${formatDate(row.period_end)}`,
    `Pay date ${formatDate(row.pay_date)}`,
  ].join(" • ");
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

function SummaryBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{detail}</div>
    </div>
  );
}

function SelectShell({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className={labelClass()}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass()}
      >
        {children}
      </select>
    </label>
  );
}

export default function NewPayrollFundAllocationPage() {
  const navigate = useNavigate();

  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriodRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<ApprovedPaycheckRequestRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    payrollPeriodId: "",
    basketName: "",
    fundingBankAccountId: "",
    fundingCurrencyCode: "USD",
    allocatedFundingAmount: "0",
    allocatedFundingDate: todayDate(),
    allocationReference: "",
    allocationNotes: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const selectedPeriod = useMemo(() => {
    return payrollPeriods.find((row) => row.id === form.payrollPeriodId) || null;
  }, [form.payrollPeriodId, payrollPeriods]);

  const selectedBankAccount = useMemo(() => {
    return bankAccounts.find((row) => row.id === form.fundingBankAccountId) || null;
  }, [bankAccounts, form.fundingBankAccountId]);

  const activeCurrencyCodes = useMemo(() => {
    const codes = currencies
      .filter((row) => row.status === "active")
      .map((row) => row.currency_code);

    return codes.length > 0 ? codes : ["USD"];
  }, [currencies]);

  const periodApprovedRequests = useMemo(() => {
    if (!selectedPeriod) return approvedRequests;

    return approvedRequests.filter((row) => {
      const startsInside =
        row.period_start >= selectedPeriod.period_start &&
        row.period_start <= selectedPeriod.period_end;
      const endsInside =
        row.period_end >= selectedPeriod.period_start &&
        row.period_end <= selectedPeriod.period_end;

      return startsInside || endsInside;
    });
  }, [approvedRequests, selectedPeriod]);

  const approvedTotalByCurrency = useMemo(() => {
    return periodApprovedRequests.reduce<Record<string, number>>((totals, row) => {
      const currency = row.requested_currency_code || "USD";
      totals[currency] = (totals[currency] || 0) + toNumber(row.requested_net_amount);
      return totals;
    }, {});
  }, [periodApprovedRequests]);

  const approvedTotalMainCurrency = useMemo(() => {
    return periodApprovedRequests
      .filter((row) => row.requested_currency_code === form.fundingCurrencyCode)
      .reduce((sum, row) => sum + toNumber(row.requested_net_amount), 0);
  }, [form.fundingCurrencyCode, periodApprovedRequests]);

  const allocatedFundingAmount = toNumber(form.allocatedFundingAmount);
  const fundingGapInSameCurrency = allocatedFundingAmount - approvedTotalMainCurrency;

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
    },
    []
  );

        const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("You must be signed in to create a payroll fund basket.");
      }

      setCurrentUserId(user.id);

      const [periodsResult, bankAccountsResult, currenciesResult, requestsResult] =
        await Promise.all([
          supabase
            .from("finance_payroll_periods")
            .select("id, period_number, period_name, period_start, period_end, pay_date, status")
            .in("status", ["open", "draft", "active", "pending", "approved"])
            .order("period_start", { ascending: false }),

          supabase
            .from("finance_bank_accounts")
            .select(
              [
                "id",
                "code",
                "name",
                "account_type",
                "institution_name",
                "masked_account_number",
                "status",
                "beneficiary_name",
                "currency_code",
                "swift_code",
                "iban",
                "bank_name",
                "company_id",
              ].join(", ")
            )
            .eq("status", "active")
            .order("name", { ascending: true }),

          supabase
            .from("finance_currencies")
            .select(
              "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status"
            )
            .eq("status", "active")
            .order("currency_code", { ascending: true }),

          supabase
            .from("finance_paycheck_requests")
            .select(
              "id, request_number, employee_ref_id, employee_user_id, requested_currency_code, requested_net_amount, status, review_status, period_start, period_end"
            )
            .eq("status", "approved_for_payroll")
            .eq("review_status", "approved")
            .is("linked_payroll_run_id", null)
            .order("created_at", { ascending: false }),
        ]);

      if (periodsResult.error) throw periodsResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (requestsResult.error) throw requestsResult.error;

      const loadedPeriods = (periodsResult.data || []) as unknown as PayrollPeriodRow[];
      const loadedBankAccounts = (bankAccountsResult.data || []) as unknown as BankAccountRow[];
      const loadedCurrencies = (currenciesResult.data || []) as unknown as CurrencyRow[];
      const loadedRequests = (requestsResult.data || []) as unknown as ApprovedPaycheckRequestRow[];

      setPayrollPeriods(loadedPeriods);
      setBankAccounts(loadedBankAccounts);
      setCurrencies(loadedCurrencies);
      setApprovedRequests(loadedRequests);

      const firstPeriod = loadedPeriods[0] || null;
      const firstBank = loadedBankAccounts[0] || null;
      const baseCurrency =
        loadedCurrencies.find((row) => row.is_base_currency)?.currency_code ||
        firstBank?.currency_code ||
        loadedCurrencies[0]?.currency_code ||
        "USD";

      setForm((current) => ({
        ...current,
        payrollPeriodId: current.payrollPeriodId || firstPeriod?.id || "",
        basketName:
          current.basketName ||
          (firstPeriod
            ? `${firstPeriod.period_name || firstPeriod.period_number || "Payroll"} Fund Basket`
            : ""),
        fundingBankAccountId: current.fundingBankAccountId || firstBank?.id || "",
        fundingCurrencyCode: current.fundingCurrencyCode || baseCurrency,
      }));
    } catch (error) {
      console.error("Failed to load payroll allocation data:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to load payroll allocation data."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!selectedBankAccount?.currency_code) return;

    setForm((current) => ({
      ...current,
      fundingCurrencyCode: selectedBankAccount.currency_code || current.fundingCurrencyCode,
    }));
  }, [selectedBankAccount]);

  useEffect(() => {
    if (!selectedPeriod) return;

    setForm((current) => {
      if (current.basketName.trim()) return current;

      return {
        ...current,
        basketName: `${
          selectedPeriod.period_name || selectedPeriod.period_number || "Payroll"
        } Fund Basket`,
      };
    });
  }, [selectedPeriod]);

  const validateForm = useCallback(() => {
    if (!currentUserId) return "You must be signed in.";

    if (!form.payrollPeriodId) {
      return "Select a payroll period.";
    }

    if (!form.basketName.trim()) {
      return "Write a payroll basket name.";
    }

    if (!form.fundingBankAccountId) {
      return "Select a funding bank account.";
    }

    if (!form.fundingCurrencyCode.trim()) {
      return "Select a funding currency.";
    }

    if (allocatedFundingAmount <= 0) {
      return "Allocated funding amount must be greater than 0.";
    }

    if (!form.allocatedFundingDate) {
      return "Allocation date is required.";
    }

    return null;
  }, [
    allocatedFundingAmount,
    currentUserId,
    form.allocatedFundingDate,
    form.basketName,
    form.fundingBankAccountId,
    form.fundingCurrencyCode,
    form.payrollPeriodId,
  ]);

  const savePayrollBasket = useCallback(async () => {
    setIsSaving(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const validationError = validateForm();

      if (validationError) {
        throw new Error(validationError);
      }

      if (!currentUserId || !selectedPeriod) {
        throw new Error("Missing user or payroll period context.");
      }

      const insertResult = await supabase
        .from("finance_payroll_runs")
        .insert({
          payroll_period_id: selectedPeriod.id,
          status: "draft",
          total_gross: 0,
          total_deductions: 0,
          total_bonus: 0,
          total_reimbursements: 0,
          total_net: 0,
          notes: form.allocationNotes.trim() || null,
          metadata: {
            basket_name: form.basketName.trim(),
            basket_type: "payroll_fund_allocation",
            approved_request_context: {
              approved_request_count: periodApprovedRequests.length,
              approved_request_total_by_currency: approvedTotalByCurrency,
              approved_request_total_same_currency: approvedTotalMainCurrency,
              context_only: true,
              linking_happens_on_id_page: true,
            },
          },
          funding_company_id: selectedBankAccount?.company_id || null,
          funding_bank_account_id: form.fundingBankAccountId,
          funding_currency_code: form.fundingCurrencyCode.trim().toUpperCase(),
          allocated_funding_amount: allocatedFundingAmount,
          allocated_funding_date: form.allocatedFundingDate,
          allocation_reference: form.allocationReference.trim() || null,
          allocation_notes: form.allocationNotes.trim() || null,
          allocation_status: "allocated",
          allocation_metadata: {
            funding_bank_snapshot: selectedBankAccount
              ? {
                  id: selectedBankAccount.id,
                  name: selectedBankAccount.name,
                  bank_name: selectedBankAccount.bank_name,
                  institution_name: selectedBankAccount.institution_name,
                  masked_account_number: selectedBankAccount.masked_account_number,
                  beneficiary_name: selectedBankAccount.beneficiary_name,
                  currency_code: selectedBankAccount.currency_code,
                  iban: selectedBankAccount.iban,
                  swift_code: selectedBankAccount.swift_code,
                  identifier: getBankIdentifier(selectedBankAccount),
                  company_id: selectedBankAccount.company_id,
                }
              : null,
            allocation_summary: {
              basket_name: form.basketName.trim(),
              funding_currency_code: form.fundingCurrencyCode.trim().toUpperCase(),
              allocated_funding_amount: allocatedFundingAmount,
              allocated_funding_date: form.allocatedFundingDate,
              allocation_reference: form.allocationReference.trim() || null,
              approved_request_total_by_currency: approvedTotalByCurrency,
              approved_request_count: periodApprovedRequests.length,
            },
          },
          created_by: currentUserId,
          updated_by: currentUserId,
        })
        .select("id")
        .single();

      if (insertResult.error) throw insertResult.error;

      const payrollRunId = insertResult.data.id as string;

      setActionMessage("Payroll fund basket created.");
      navigate(`/finance/transactions/payroll/${payrollRunId}`);
    } catch (error) {
      console.error("Failed to create payroll fund basket:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to create payroll fund basket."
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    allocatedFundingAmount,
    approvedTotalByCurrency,
    approvedTotalMainCurrency,
    currentUserId,
    form.allocatedFundingDate,
    form.allocationNotes,
    form.allocationReference,
    form.basketName,
    form.fundingBankAccountId,
    form.fundingCurrencyCode,
    navigate,
    periodApprovedRequests.length,
    selectedBankAccount,
    selectedPeriod,
    validateForm,
  ]);

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/payroll")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Payroll
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-stretch">
              <div className="min-w-0">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <WalletCards className="h-3.5 w-3.5" />
                  New Payroll Fund Allocation
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Create Payroll Fund Basket
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Allocate one funding basket for payroll. Approved paycheck requests are shown only
                  as context here. Linking requests and executing per-paycheck payments happens on the
                  Payroll ID page.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Fund Basket Only
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    Approved Requests Context
                  </div>
                  <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                    No Employee Payment Here
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <SummaryBlock
                  label="Allocated Funding"
                  value={`${form.fundingCurrencyCode || "USD"} ${formatMoney(allocatedFundingAmount)}`}
                  detail="Total funding available for this payroll basket."
                />
                <SummaryBlock
                  label="Approved Requests Context"
                  value={formatCount(periodApprovedRequests.length)}
                  detail="Approved unlinked paycheck requests matching this period."
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
              title="Payroll Basket Setup"
              description="Create the payroll allocation basket and attach it to a payroll period."
              icon={ReceiptText}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <SelectShell
                  label="Payroll Period"
                  value={form.payrollPeriodId}
                  onChange={(value) => updateField("payrollPeriodId", value)}
                >
                  <option value="">Select payroll period</option>
                  {payrollPeriods.map((row) => (
                    <option key={row.id} value={row.id}>
                      {getPeriodLabel(row)}
                    </option>
                  ))}
                </SelectShell>

                <label className="grid gap-2">
                  <span className={labelClass()}>Basket Name</span>
                  <input
                    value={form.basketName}
                    onChange={(event) => updateField("basketName", event.target.value)}
                    placeholder="April Payroll Fund Basket"
                    className={inputClass()}
                  />
                </label>
              </div>
            </SectionCard>

            <SectionCard
              title="Funding Allocation"
              description="Choose the funding bank account and allocate the total payroll basket amount."
              icon={Landmark}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <SelectShell
                  label="Funding Bank Account"
                  value={form.fundingBankAccountId}
                  onChange={(value) => updateField("fundingBankAccountId", value)}
                >
                  <option value="">Select funding bank account</option>
                  {bankAccounts.map((row) => (
                    <option key={row.id} value={row.id}>
                      {getBankAccountLabel(row)}
                    </option>
                  ))}
                </SelectShell>

                <SelectShell
                  label="Funding Currency"
                  value={form.fundingCurrencyCode}
                  onChange={(value) => updateField("fundingCurrencyCode", value)}
                >
                  {activeCurrencyCodes.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </SelectShell>

                <label className="grid gap-2">
                  <span className={labelClass()}>Allocated Funding Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.allocatedFundingAmount}
                    onChange={(event) =>
                      updateField("allocatedFundingAmount", event.target.value)
                    }
                    className={inputClass()}
                  />
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Allocation Date</span>
                  <input
                    type="date"
                    value={form.allocatedFundingDate}
                    onChange={(event) =>
                      updateField("allocatedFundingDate", event.target.value)
                    }
                    className={inputClass()}
                  />
                </label>

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Allocation Reference</span>
                  <input
                    value={form.allocationReference}
                    onChange={(event) =>
                      updateField("allocationReference", event.target.value)
                    }
                    placeholder="Bank transfer ref / internal allocation reference"
                    className={inputClass()}
                  />
                </label>

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Allocation Notes</span>
                  <textarea
                    value={form.allocationNotes}
                    onChange={(event) => updateField("allocationNotes", event.target.value)}
                    placeholder="Internal notes for Finance/Admin"
                    className={textareaClass()}
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <SummaryBlock
                  label="Funding Account"
                  value={selectedBankAccount ? getBankAccountLabel(selectedBankAccount) : "—"}
                  detail={getBankIdentifier(selectedBankAccount)}
                />
                <SummaryBlock
                  label="Funding Currency"
                  value={form.fundingCurrencyCode || "—"}
                  detail="Payment conversion happens later per paycheck on the ID page."
                />
                <SummaryBlock
                  label="Funding Gap Context"
                  value={`${form.fundingCurrencyCode || "USD"} ${formatMoney(fundingGapInSameCurrency)}`}
                  detail="Same-currency allocation minus approved request context total."
                />
              </div>
            </SectionCard>

                        <SectionCard
              title="Approved Paycheck Requests Context"
              description="This page does not link requests. It only shows approved unlinked requests as context for the funding basket."
              icon={BadgeCheck}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryBlock
                  label="Approved Requests"
                  value={formatCount(periodApprovedRequests.length)}
                  detail="Approved and not linked to payroll yet."
                />
                <SummaryBlock
                  label="Same Currency Total"
                  value={`${form.fundingCurrencyCode || "USD"} ${formatMoney(
                    approvedTotalMainCurrency
                  )}`}
                  detail="Only approved requests matching funding currency."
                />
                <SummaryBlock
                  label="Funding Allocated"
                  value={`${form.fundingCurrencyCode || "USD"} ${formatMoney(
                    allocatedFundingAmount
                  )}`}
                  detail="Total basket fund entered on this page."
                />
                <SummaryBlock
                  label="Context Gap"
                  value={`${form.fundingCurrencyCode || "USD"} ${formatMoney(
                    fundingGapInSameCurrency
                  )}`}
                  detail="Allocated funds minus same-currency approved context."
                />
              </div>

              <div className="mt-4 max-h-[430px] overflow-y-auto rounded-[24px] border border-white/10 bg-black/20">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse">
                    <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur-xl">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Request
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Period
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Currency
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Net Amount
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/5">
                      {periodApprovedRequests.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-10 text-center text-sm text-slate-500"
                          >
                            No approved unlinked paycheck requests match this period yet.
                          </td>
                        </tr>
                      ) : (
                        periodApprovedRequests.map((request) => (
                          <tr
                            key={request.id}
                            className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                          >
                            <td className="px-4 py-4 font-semibold text-white">
                              {request.request_number || "Approved Request"}
                            </td>
                            <td className="px-4 py-4 text-slate-400">
                              {formatDate(request.period_start)} →{" "}
                              {formatDate(request.period_end)}
                            </td>
                            <td className="px-4 py-4 font-semibold text-cyan-100">
                              {request.requested_currency_code || "USD"}
                            </td>
                            <td className="px-4 py-4 text-right font-semibold text-white">
                              {formatMoney(request.requested_net_amount)}
                            </td>
                            <td className="px-4 py-4 text-slate-400">
                              {formatLabel(request.status)} /{" "}
                              {formatLabel(request.review_status)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100/80">
                This table is context only. Approved paycheck requests will be added one by
                one from the payroll ID page.
              </div>
            </SectionCard>
          </div>

          <aside className="sticky top-6 grid gap-6 self-start">
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Allocation Summary
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Create the payroll fund basket. Per-paycheck actions happen later.
                </p>
              </div>

              <div className="grid gap-4 p-5">
                <SummaryBlock
                  label="Basket Name"
                  value={form.basketName.trim() || "Payroll Fund Basket"}
                  detail={selectedPeriod ? getPeriodLabel(selectedPeriod) : "No period selected"}
                />

                <SummaryBlock
                  label="Funding Bank"
                  value={selectedBankAccount ? getBankAccountLabel(selectedBankAccount) : "—"}
                  detail={getBankIdentifier(selectedBankAccount)}
                />

                <SummaryBlock
                  label="Allocated Amount"
                  value={`${form.fundingCurrencyCode || "USD"} ${formatMoney(
                    allocatedFundingAmount
                  )}`}
                  detail={`Allocation date: ${formatDate(form.allocatedFundingDate)}`}
                />

                <SummaryBlock
                  label="Approved Context"
                  value={formatCount(periodApprovedRequests.length)}
                  detail="Approved unlinked paycheck requests visible for this selected period."
                />

                <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-4">
                  <div className="text-sm font-semibold text-cyan-100">
                    What this page does
                  </div>
                  <p className="mt-2 text-xs leading-5 text-cyan-100/75">
                    This creates the total payroll funding basket only. It does not link
                    paycheck requests and does not send money to employees.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void savePayrollBasket()}
                  disabled={isSaving || isLoading}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Create Payroll Fund Basket
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Totals By Currency
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Approved paycheck requests may be in different currencies.
                </p>
              </div>

              <div className="grid gap-3 p-5">
                {Object.keys(approvedTotalByCurrency).length === 0 ? (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-slate-500">
                    No approved request totals yet.
                  </div>
                ) : (
                  Object.entries(approvedTotalByCurrency).map(([currency, total]) => (
                    <SummaryBlock
                      key={currency}
                      label={currency}
                      value={formatMoney(total)}
                      detail="Approved unlinked paycheck request total."
                    />
                  ))
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
