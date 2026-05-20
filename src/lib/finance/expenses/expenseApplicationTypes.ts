import type { FinanceEmployeeIdentity } from "@/lib/finance/employeeIdentity";

export type CompanyRow = {
  id: string;
  name: string | null;
};

export type EmployeeRefRow = {
  id: string;
  user_id: string;
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

export type CurrencyRow = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  status: string;
};

export type ExpenseMadeByType =
  | "employee"
  | "owner_management"
  | "company_direct"
  | "other";

export type ExpenseApplicationFormState = {
  companyId: string;
  expenseMadeByType: ExpenseMadeByType;
  employeeRefId: string;
  responsiblePersonName: string;
  otherMadeByExplanation: string;
  title: string;
  description: string;
  expenseType: string;
  otherExpenseExplanation: string;
  expenseSourceName: string;
  requestedAmount: string;
  currencyCode: string;
  expenseDate: string;
  isRetroactive: boolean;
  retroactiveReason: string;
  externalDocumentationLink: string;
  notes: string;
  reimbursementPaymentMethod: string;
  reimbursementPaymentMethodOther: string;
  reimbursementReason: string;
};

export type SelectOption = {
  value: string;
  label: string;
};

export type CachedOptionsPayload = {
  companies: CompanyRow[];
  employees: EmployeeRefRow[];
  employeeIdentities: FinanceEmployeeIdentity[];
  currencies: CurrencyRow[];
  cachedAt: number;
};

export const EXPENSE_TYPE_OPTIONS: SelectOption[] = [
  { value: "office_support", label: "Office Support" },
  { value: "reimbursement", label: "Reimbursement" },
  { value: "utilities", label: "Utilities" },
  { value: "software_subscription", label: "Software Subscription" },
  { value: "online_shopping", label: "Online Shopping" },
  { value: "travel", label: "Travel" },
  { value: "meals", label: "Meals" },
  { value: "bank_charges", label: "Bank Charges" },
  { value: "legal_accounting", label: "Legal / Accounting" },
  { value: "government_fee", label: "Government Fee" },
  { value: "repair_service", label: "Repair / Service" },
  { value: "company_support", label: "Company Support" },
  { value: "other", label: "Other" },
];

export const EXPENSE_MADE_BY_OPTIONS: SelectOption[] = [
  { value: "employee", label: "Employee" },
  { value: "owner_management", label: "Owner / Management" },
  { value: "company_direct", label: "Company Direct" },
  { value: "other", label: "Other" },
];

export const REIMBURSEMENT_PAYMENT_METHODS: SelectOption[] = [
  { value: "personal_cash", label: "Personal Cash" },
  { value: "personal_card", label: "Personal Card" },
  { value: "personal_bank_transfer", label: "Personal Bank Transfer" },
  { value: "personal_digital_wallet", label: "Personal Digital Wallet" },
  { value: "other", label: "Other" },
];

export const WIZARD_STAGE_IDS = [
  "expense-type",
  "payee",
  "details",
  "amount",
  "receipts",
  "review-submit",
] as const;

export type ExpenseWizardStageId = (typeof WIZARD_STAGE_IDS)[number];

export function createInitialExpenseApplicationFormState(): ExpenseApplicationFormState {
  return {
    companyId: "",
    expenseMadeByType: "employee",
    employeeRefId: "",
    responsiblePersonName: "",
    otherMadeByExplanation: "",
    title: "",
    description: "",
    expenseType: "office_support",
    otherExpenseExplanation: "",
    expenseSourceName: "",
    requestedAmount: "",
    currencyCode: "USD",
    expenseDate: new Date().toISOString().slice(0, 10),
    isRetroactive: false,
    retroactiveReason: "",
    externalDocumentationLink: "",
    notes: "",
    reimbursementPaymentMethod: "personal_card",
    reimbursementPaymentMethodOther: "",
    reimbursementReason: "",
  };
}
