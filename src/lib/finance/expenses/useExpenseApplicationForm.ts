import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FinanceEmployeeIdentity } from "@/lib/finance/employeeIdentity";
import { supabase } from "@/lib/supabase";

import {
  createInitialExpenseApplicationFormState,
  type CachedOptionsPayload,
  type CompanyRow,
  type CurrencyRow,
  type EmployeeRefRow,
  type ExpenseApplicationFormState,
  type ExpenseWizardStageId,
} from "./expenseApplicationTypes";
import {
  saveExpenseApplication,
  validateExpenseApplicationForm,
  validateExpenseWizardStage,
  type SaveExpenseApplicationInput,
} from "./saveExpenseApplication";

const OPTIONS_CACHE_KEY = "aixia.finance.expenses.process.options.v1";
const OPTIONS_CACHE_TTL_MS = 1000 * 60 * 5;

function readOptionsCache(): Omit<CachedOptionsPayload, "cachedAt"> | null {
  try {
    const rawPayload = window.sessionStorage.getItem(OPTIONS_CACHE_KEY);
    if (!rawPayload) return null;
    const parsedPayload = JSON.parse(rawPayload) as CachedOptionsPayload;
    if (Date.now() - parsedPayload.cachedAt >= OPTIONS_CACHE_TTL_MS) return null;
    return parsedPayload;
  } catch {
    return null;
  }
}

function writeOptionsCache(payload: Omit<CachedOptionsPayload, "cachedAt">) {
  try {
    window.sessionStorage.setItem(
      OPTIONS_CACHE_KEY,
      JSON.stringify({ ...payload, cachedAt: Date.now() }),
    );
  } catch {
    // optional cache
  }
}

export type UseExpenseApplicationFormOptions = {
  expenseId?: string;
};

export function useExpenseApplicationForm(options: UseExpenseApplicationFormOptions = {}) {
  const hasMountedRef = useRef(false);

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [employeeIdentities, setEmployeeIdentities] = useState<FinanceEmployeeIdentity[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [form, setForm] = useState<ExpenseApplicationFormState>(
    createInitialExpenseApplicationFormState(),
  );
  const [documentationFile, setDocumentationFile] = useState<File | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isLoadingExpense, setIsLoadingExpense] = useState(Boolean(options.expenseId));
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const documentationStatus = useMemo(() => {
    if (documentationFile && form.externalDocumentationLink.trim()) return "files_and_links";
    if (documentationFile) return "uploaded";
    if (form.externalDocumentationLink.trim()) return "linked";
    return "missing";
  }, [documentationFile, form.externalDocumentationLink]);

  const saveInput = useMemo<SaveExpenseApplicationInput>(
    () => ({
      form,
      documentationFile,
      documentationStatus,
      submitMode: "request",
      companies,
      employees,
      employeeIdentities,
      currencies,
      intakeContext: options.expenseId
        ? "expenses_process_wizard_resume"
        : "expenses_process_wizard",
    }),
    [
      companies,
      currencies,
      documentationFile,
      documentationStatus,
      employeeIdentities,
      employees,
      form,
      options.expenseId,
    ],
  );

  const updateField = useCallback(
    <Key extends keyof ExpenseApplicationFormState>(
      key: Key,
      value: ExpenseApplicationFormState[Key],
    ) => {
      setForm((current) => ({ ...current, [key]: value }));
      setFormError(null);
      setFormSuccess(null);
    },
    [],
  );

  const applyOptionsPayload = useCallback((payload: Omit<CachedOptionsPayload, "cachedAt">) => {
    setCompanies(payload.companies);
    setEmployees(payload.employees);
    setEmployeeIdentities(payload.employeeIdentities);
    setCurrencies(payload.currencies);

    setForm((current) => {
      if (current.currencyCode) return current;
      const baseCurrency =
        payload.currencies.find((currency) => currency.is_base_currency) ??
        payload.currencies[0];
      if (!baseCurrency) return current;
      return { ...current, currencyCode: baseCurrency.currency_code };
    });
  }, []);

  const loadOptions = useCallback(async () => {
    const cachedOptions = readOptionsCache();
    if (cachedOptions) {
      applyOptionsPayload(cachedOptions);
      setIsLoadingOptions(false);
    } else {
      setIsLoadingOptions(true);
    }

    try {
      const [companiesResult, employeesResult, employeeIdentitiesResult, currenciesResult] =
        await Promise.all([
          supabase.from("finance_companies").select("id, name").order("name"),
          supabase
            .from("finance_employee_refs")
            .select("id, user_id, code, status, mark, metadata")
            .order("code"),
          supabase.from("finance_employee_identity_v").select("*"),
          supabase
            .from("finance_currencies")
            .select(
              "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status",
            )
            .eq("status", "active")
            .order("is_base_currency", { ascending: false })
            .order("currency_code"),
        ]);

      if (companiesResult.error) throw companiesResult.error;
      if (employeesResult.error) throw employeesResult.error;
      if (employeeIdentitiesResult.error) throw employeeIdentitiesResult.error;
      if (currenciesResult.error) throw currenciesResult.error;

      const nextPayload = {
        companies: (companiesResult.data || []) as CompanyRow[],
        employees: (employeesResult.data || []) as EmployeeRefRow[],
        employeeIdentities: (employeeIdentitiesResult.data || []) as FinanceEmployeeIdentity[],
        currencies: (currenciesResult.data || []) as CurrencyRow[],
      };

      applyOptionsPayload(nextPayload);
      writeOptionsCache(nextPayload);
    } catch (error) {
      console.error("Failed to load expense wizard options:", error);
      setFormError("Failed to load companies, employees, or currencies.");
    } finally {
      setIsLoadingOptions(false);
    }
  }, [applyOptionsPayload]);

  const loadExistingExpense = useCallback(async (expenseId: string) => {
    setIsLoadingExpense(true);
    try {
      const { data, error } = await supabase
        .from("finance_expenses")
        .select("*")
        .eq("id", expenseId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Expense not found.");

      const metadata = (data.metadata as Record<string, unknown> | null) ?? {};
      const reimbursementFlow =
        (metadata.reimbursement_flow as Record<string, unknown> | null) ?? {};

      const typeDetails =
        (metadata.expense_type_details as Record<string, Record<string, unknown>> | null) ?? {};
      const travel = typeDetails.travel ?? {};
      const online = typeDetails.online_shopping ?? {};
      const meals = typeDetails.meals ?? {};
      const utilities = typeDetails.utilities ?? {};
      const software = typeDetails.software_subscription ?? {};
      const repair = typeDetails.repair_service ?? {};

      setForm({
        ...createInitialExpenseApplicationFormState(),
        companyId: String(data.company_id ?? ""),
        expenseMadeByType: "employee",
        employeeRefId: String(data.employee_ref_id ?? ""),
        responsiblePersonName: String(data.responsible_person_name ?? ""),
        otherMadeByExplanation: String(data.other_made_by_explanation ?? ""),
        title: String(data.title ?? ""),
        description: String(data.description ?? ""),
        expenseType: String(data.expense_type ?? "office_support"),
        otherExpenseExplanation: String(data.other_expense_explanation ?? ""),
        expenseSourceName: String(data.expense_source_name ?? ""),
        requestedAmount: String(data.requested_amount ?? data.amount ?? ""),
        currencyCode: String(data.currency_code ?? "USD"),
        expenseDate: String(data.expense_date ?? new Date().toISOString().slice(0, 10)),
        isRetroactive: Boolean(data.is_retroactive),
        retroactiveReason: String(data.retroactive_reason ?? ""),
        externalDocumentationLink: String(metadata.documentation_link ?? ""),
        notes: String(data.notes ?? ""),
        reimbursementPaymentMethod: String(reimbursementFlow.payment_method ?? "personal_card"),
        reimbursementPaymentMethodOther: "",
        reimbursementReason: String(reimbursementFlow.reimbursement_reason ?? ""),
        travelType: String(travel.travel_type ?? "taxi"),
        travelFrom: String(travel.from ?? ""),
        travelTo: String(travel.to ?? ""),
        travelDate: String(travel.travel_date ?? data.expense_date ?? ""),
        travelReason: String(travel.reason ?? ""),
        onlinePlatform: String(data.online_platform ?? online.platform ?? ""),
        onlineOrderNumber: String(data.online_order_number ?? online.order_number ?? ""),
        onlineOrderDate: String(data.online_order_date ?? online.order_date ?? ""),
        mealVendorName: String(meals.vendor_name ?? ""),
        mealType: String(meals.meal_type ?? "business_meal"),
        mealDate: String(meals.meal_date ?? data.expense_date ?? ""),
        utilityType: String(utilities.utility_type ?? "electricity"),
        utilityProviderName: String(utilities.provider_name ?? ""),
        subscriptionProviderName: String(software.provider_name ?? ""),
        repairProviderName: String(repair.provider_name ?? ""),
        repairIssueDescription: String(repair.issue_description ?? ""),
      });
    } catch (error) {
      console.error("Failed to load expense for wizard:", error);
      setFormError(error instanceof Error ? error.message : "Failed to load expense.");
    } finally {
      setIsLoadingExpense(false);
    }
  }, []);

  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (employees.length === 0) return;

    void (async () => {
      const authResult = await supabase.auth.getUser();
      const userId = authResult.data.user?.id;
      if (!userId) return;

      const ownEmployee =
        employees.find((employee) => employee.user_id === userId) ?? employees[0] ?? null;

      if (!ownEmployee) return;

      setForm((current) => ({
        ...current,
        expenseMadeByType: "employee",
        employeeRefId: current.employeeRefId || ownEmployee.id,
        companyId: current.companyId || companies[0]?.id || "",
      }));
    })();
  }, [companies, employees]);

  useEffect(() => {
    if (!options.expenseId) return;
    void loadExistingExpense(options.expenseId);
  }, [loadExistingExpense, options.expenseId]);

  const validateStage = useCallback(
    (stageId: ExpenseWizardStageId | string) => {
      return validateExpenseWizardStage(stageId, saveInput);
    },
    [saveInput],
  );

  const saveExpense = useCallback(
    async (submitMode: "draft" | "request") => {
      setIsSaving(true);
      setFormError(null);
      setFormSuccess(null);

      try {
        const input: SaveExpenseApplicationInput = { ...saveInput, submitMode };
        const validationError =
          submitMode === "draft"
            ? validateExpenseWizardStage("payee", input)
            : validateExpenseApplicationForm(input);

        if (validationError) {
          setFormError(validationError);
          return null;
        }

        const result = await saveExpenseApplication(input);
        setFormSuccess(
          submitMode === "request"
            ? "Expense request submitted for Finance review."
            : "Expense draft saved.",
        );
        return result;
      } catch (error) {
        console.error("Failed to save expense from wizard:", error);
        setFormError(error instanceof Error ? error.message : "Failed to save expense.");
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [saveInput],
  );

  return {
    form,
    updateField,
    companies,
    employees,
    employeeIdentities,
    currencies,
    documentationFile,
    setDocumentationFile,
    documentationStatus,
    isLoadingOptions,
    isLoadingExpense,
    isSaving,
    formError,
    formSuccess,
    validateStage,
    saveExpense,
  };
}

export type ExpenseApplicationFormContext = ReturnType<typeof useExpenseApplicationForm>;
