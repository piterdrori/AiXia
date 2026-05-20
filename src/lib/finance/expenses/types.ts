export type ExpenseLoadMode = "initial" | "silent";

export type ArchiveTab = "archived" | "deleted";

export type ExpenseRow = {
  id: string;
  expense_number: string | null;
  title: string;
  description: string | null;
  amount: number | string | null;
  requested_amount: number | string | null;
  approved_amount: number | string | null;
  final_amount: number | string | null;
  currency_code: string | null;
  expense_date: string;
  expense_type: string;
  status: string;
  approval_status: string | null;
  payment_status: string | null;
  request_status: string | null;
  documentation_status: string | null;
  finance_review_status: string | null;
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
  online_confirmation_status: string | null;
  verified_for_payment_at: string | null;
  verification_notes: string | null;
  submitter_user_id?: string | null;
  created_by?: string | null;
  metadata: {
    documentation_link?: string | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
  updated_at: string;
};

export type FundingBatchRow = {
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
  created_at: string;
  updated_at: string;
};

export type PaymentMadeRow = {
  id: string;
  amount: number | string | null;
  payment_date: string;
  payment_method_id: string | null;
  status: string;
  reference_number: string | null;
  vendor_id: string | null;
  bill_id: string | null;
  notes: string | null;
  payment_source_type: string | null;
  expense_funding_batch_id: string | null;
  recipient_employee_ref_id: string | null;
  recipient_person_name: string | null;
  recipient_confirmation_status: string | null;
  paid_from_company_id: string | null;
  paid_from_bank_account_id: string | null;
  payment_currency_code: string | null;
  converted_amount: number | string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseAllocationRow = {
  id: string;
  payment_made_id: string;
  expense_id: string;
  funding_batch_id: string | null;
  funding_company_id: string | null;
  paid_from_bank_account_id: string | null;
  recipient_employee_ref_id: string | null;
  recipient_person_name: string | null;
  allocated_amount: number | string | null;
  currency_code: string | null;
  payment_currency_code: string | null;
  converted_amount: number | string | null;
  recipient_confirmation_status: string | null;
  lifecycle_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type ReviewQueueKey =
  | "pending_approval"
  | "approved_to_spend"
  | "documentation"
  | "verified_for_payment";

export type PaymentQueueKey = "payments" | "allocations" | "recipient_tracking";

export type LifecycleAction = "archive" | "delete" | "restore" | "hard_delete";

export type AllocationAction = LifecycleAction;
