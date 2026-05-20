import type { AixiaProcessStageItem, AixiaProcessSummaryItem } from "@/components/aixia";

export type ProcessBookRole = "employee" | "admin";

export type ExpenseProcessKey = "application" | "review" | "funding" | "payment";

export type PayrollProcessKey = "review" | "funding" | "payment";

export type ProcessHistoryTab = "active" | "archived" | "deleted";

export type ExpenseProcessPermissionKey =
  | "canApplyExpense"
  | "canReviewExpenses"
  | "canManageFundingPool"
  | "canExecutePayments"
  | "canViewExpenseHistory";

export type PayrollProcessPermissionKey =
  | "canReviewPayroll"
  | "canManagePayrollFunding"
  | "canExecutePayrollPayments"
  | "canViewPayrollHistory";

export type ProcessTemplateStage = Pick<AixiaProcessStageItem, "id" | "title" | "description">;

export type ExpenseProcessTemplate = {
  key: ExpenseProcessKey;
  label: string;
  infoTitle: string;
  infoText: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  progressLabel: string;
  recordLabel: string;
  permissionKey: ExpenseProcessPermissionKey;
  employeeVisible: boolean;
  adminVisible: boolean;
  summary: AixiaProcessSummaryItem[];
  stages: ProcessTemplateStage[];
  finalActionLabel: string;
};

export type PayrollProcessTemplate = {
  key: PayrollProcessKey;
  label: string;
  infoTitle: string;
  infoText: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  progressLabel: string;
  recordLabel: string;
  permissionKey: PayrollProcessPermissionKey;
  adminVisible: boolean;
  summary: AixiaProcessSummaryItem[];
  stages: ProcessTemplateStage[];
  finalActionLabel: string;
};

export type ProcessPipelineStep = {
  key: string;
  label: string;
  description?: string;
  count?: number;
  route?: string;
  processKey?: ExpenseProcessKey | PayrollProcessKey;
};

export type ExpenseStageResolution = {
  processKey: ExpenseProcessKey;
  stageId: string;
  route: string;
};

export type ExpenseHistoryRow = {
  id: string;
  expense_number: string | null;
  title: string;
  expense_type: string;
  amount: number | string | null;
  currency_code: string | null;
  expense_date: string;
  status: string;
  approval_status: string | null;
  payment_status: string | null;
  request_status: string | null;
  documentation_status: string | null;
  recipient_confirmation_status: string | null;
  employee_name?: string | null;
  lifecycle: ProcessHistoryTab;
  next_action: string;
  employee_status: string;
  admin_status: string;
};

export type PayrollHistoryRow = {
  id: string;
  request_number: string | null;
  reference_number: string | null;
  period_start: string;
  period_end: string;
  requested_currency_code: string;
  requested_net_amount: number | string | null;
  status: string;
  review_status: string;
  documentation_status: string;
  payment_status: string | null;
  recipient_confirmation_status: string;
  employee_name?: string | null;
  lifecycle: ProcessHistoryTab;
  next_action: string;
  admin_status: string;
};
