export type FinanceRecordStatus = "active" | "inactive" | "archived";

export type FinanceInvoiceIssuedStatus =
  | "draft"
  | "issued"
  | "void"
  | "canceled"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type FinanceInvoiceIssuedPaymentStatus =
  | "unpaid"
  | "partial"
  | "paid";

export type FinancePaymentReceivedStatus =
  | "draft"
  | "confirmed"
  | "cancelled";

export type FinanceBillReceivedStatus =
  | "draft"
  | "pending_approval_ready"
  | "approved_ready"
  | "open"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void"
  | "canceled";

export type FinancePaymentMadeStatus =
  | "pending"
  | "confirmed"
  | "failed"
  | "reversed";

export interface FinanceBaseRecord<TStatus extends string = FinanceRecordStatus> {
  id: string;
  status: TStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
  project_id: string | null;
  task_id: string | null;
  reference_number: string | null;
  posted_to_ledger: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface FinanceClient extends FinanceBaseRecord {
  code: string | null;
  name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  billing_address: string | null;
  payment_terms_days: number;
  company_email: string | null;
  personnel_email: string | null;
  company_phone: string | null;
  personnel_phone: string | null;
  company_related_personnel: string | null;
  country: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  shipping_address_line_1: string | null;
  shipping_address_line_2: string | null;
}

export interface FinanceVendor extends FinanceBaseRecord {
  code: string | null;
  name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  billing_address: string | null;
  payment_terms_days: number;
  company_email: string | null;
  personnel_email: string | null;
  company_phone: string | null;
  personnel_phone: string | null;
  company_related_personnel: string | null;
  country: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  shipping_address_line_1: string | null;
  shipping_address_line_2: string | null;
}

export interface FinanceBankAccount extends FinanceBaseRecord {
  code: string | null;
  name: string;
  account_type: string;
  institution_name: string | null;
  masked_account_number: string | null;
  opening_balance: number;
}

export interface FinancePaymentMethod extends FinanceBaseRecord {
  code: string | null;
  name: string;
  description: string | null;
}

export interface FinanceExpenseCategory extends FinanceBaseRecord {
  code: string | null;
  name: string;
  description: string | null;
}

export interface FinanceRevenueCategory extends FinanceBaseRecord {
  code: string | null;
  name: string;
  description: string | null;
}

export interface FinanceCurrency {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  status: FinanceRecordStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface FinanceExchangeRate {
  id: string;
  from_currency_code: string;
  to_currency_code: string;
  exchange_rate: string;
  effective_date: string;
  status: FinanceRecordStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface FinanceInvoiceIssued
  extends FinanceBaseRecord<FinanceInvoiceIssuedStatus> {
  invoice_number: string;
  client_id: string;
  issue_date: string;
  due_date: string;
  approval_status: string | null;
  payment_status: FinanceInvoiceIssuedPaymentStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  paid_at: string | null;
  project_id: string | null;
  ledger_posted_at: string | null;
  ledger_entry_id: string | null;
  client_name_snapshot: string | null;
  billing_address_snapshot: string | null;
  client_email_snapshot: string | null;
  client_phone_snapshot: string | null;
  currency_code: string | null;
  exchange_rate: number | null;
  task_id: string | null;
  proforma_invoice_id: string | null;
  company_id: string | null;
  company_name_snapshot: string | null;
  company_address_snapshot: string | null;
  company_email_snapshot: string | null;
  company_phone_snapshot: string | null;
  payment_terms_snapshot: string | null;
  bank_details_snapshot: string | null;
  document_version: number | null;
  issued_at: string | null;
  voided_at: string | null;
  canceled_at: string | null;
  payment_terms_id: string | null;
  shipping_term_id: string | null;
  bank_account_id: string | null;
  currency_id: string | null;
}

export interface FinanceInvoiceIssuedLineItem extends FinanceBaseRecord {
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  revenue_category_id: string | null;
}

export interface FinancePaymentReceived
  extends FinanceBaseRecord<FinancePaymentReceivedStatus> {
  amount: number;
  payment_date: string;
  payment_method_id: string | null;
  client_id: string;
  invoice_id: string | null;
  bank_account_id: string | null;

  payment_currency_id: string | null;
  payment_currency_code: string;
  invoice_currency_code: string;
  exchange_rate: number;
  converted_amount: number;
  exchange_rate_source: string | null;
  exchange_rate_date: string;
}

export interface FinanceBillReceived
  extends FinanceBaseRecord<FinanceBillReceivedStatus> {
  bill_number: string;
  vendor_id: string;
  issue_date: string;
  due_date: string;
  approval_status: string | null;
  subtotal: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  paid_at: string | null;
}

export interface FinanceBillLineItem extends FinanceBaseRecord {
  bill_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  expense_category_id: string | null;
}

export interface FinancePaymentMade
  extends FinanceBaseRecord<FinancePaymentMadeStatus> {
  amount: number;
  payment_date: string;
  payment_method_id: string | null;
  vendor_id: string;
  bill_id: string | null;
  bank_account_id: string | null;
}

export interface FinanceComment {
  id: string;
  entity_type: string;
  entity_id: string;
  user_id: string | null;
  comment: string;
  status: FinanceRecordStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FinanceRecordAttachment {
  id: string;
  entity_type: string;
  entity_id: string;
  file_upload_id: string;
  uploaded_by: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface FinanceSetting extends FinanceBaseRecord {
  settings_key: string;
  settings_value: Record<string, unknown>;
  description: string | null;
}
