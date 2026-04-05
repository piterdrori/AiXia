export type FinanceRecordStatus = "active" | "inactive" | "archived";

export interface FinanceBaseRecord {
  id: string;
  status: FinanceRecordStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
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
