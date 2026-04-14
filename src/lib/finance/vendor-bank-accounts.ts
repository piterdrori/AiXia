import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_vendor_bank_accounts";
const VENDOR_TABLE = "finance_vendors";

export type FinanceVendorBankAccountStatus = "active" | "inactive" | "archived";
export type FinanceVendorBankIdentifierType = "swift" | "iban";

export type VendorOption = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  currency_code: string | null;
};

export type FinanceVendorBankAccount = {
  id: string;
  bank_id: string;
  vendor_id: string;
  vendor_code: string | null;
  beneficiary_name: string | null;
  bank_name: string | null;
  country: string | null;
  city: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  account_number: string | null;
  account_identifier_type: FinanceVendorBankIdentifierType | null;
  account_identifier_value: string | null;
  currency_code: string | null;
  is_default: boolean;
  status: FinanceVendorBankAccountStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type FinanceVendorBankAccountListRow = Pick<
  FinanceVendorBankAccount,
  | "id"
  | "bank_id"
  | "vendor_id"
  | "vendor_code"
  | "beneficiary_name"
  | "bank_name"
  | "country"
  | "city"
  | "currency_code"
  | "is_default"
  | "status"
  | "created_at"
  | "updated_at"
> & {
  vendor_name: string | null;
  vendor_legal_name: string | null;
};

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function normalizeNullable(value?: string | null) {
  const next = value?.trim() ?? "";
  return next ? next : null;
}

function normalizeIdentifierType(
  value?: string | null
): FinanceVendorBankIdentifierType | null {
  const next = value?.trim().toLowerCase();
  if (next === "swift" || next === "iban") return next;
  return null;
}

function normalizeStatus(value?: string | null): FinanceVendorBankAccountStatus {
  if (value === "inactive" || value === "archived") return value;
  return "active";
}

export async function getVendorOptions(): Promise<VendorOption[]> {
  const { data, error } = await supabase
    .from(VENDOR_TABLE)
    .select("id, code, name, legal_name, currency_code")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as VendorOption[];
}

export async function getVendorBankAccounts(): Promise<FinanceVendorBankAccountListRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      `
        id,
        bank_id,
        vendor_id,
        vendor_code,
        beneficiary_name,
        bank_name,
        country,
        city,
        currency_code,
        is_default,
        status,
        created_at,
        updated_at,
        finance_vendors!finance_vendor_bank_accounts_vendor_id_fkey (
          name,
          legal_name
        )
      `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const vendor = Array.isArray(row.finance_vendors)
      ? row.finance_vendors[0]
      : row.finance_vendors;

    return {
      id: row.id,
      bank_id: row.bank_id,
      vendor_id: row.vendor_id,
      vendor_code: row.vendor_code,
      beneficiary_name: row.beneficiary_name,
      bank_name: row.bank_name,
      country: row.country,
      city: row.city,
      currency_code: row.currency_code,
      is_default: row.is_default,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      vendor_name: vendor?.name ?? null,
      vendor_legal_name: vendor?.legal_name ?? null,
    };
  });
}

export async function getArchivedVendorBankAccounts(): Promise<
  FinanceVendorBankAccountListRow[]
> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      `
        id,
        bank_id,
        vendor_id,
        vendor_code,
        beneficiary_name,
        bank_name,
        country,
        city,
        currency_code,
        is_default,
        status,
        created_at,
        updated_at,
        finance_vendors!finance_vendor_bank_accounts_vendor_id_fkey (
          name,
          legal_name
        )
      `
    )
    .eq("status", "archived")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const vendor = Array.isArray(row.finance_vendors)
      ? row.finance_vendors[0]
      : row.finance_vendors;

    return {
      id: row.id,
      bank_id: row.bank_id,
      vendor_id: row.vendor_id,
      vendor_code: row.vendor_code,
      beneficiary_name: row.beneficiary_name,
      bank_name: row.bank_name,
      country: row.country,
      city: row.city,
      currency_code: row.currency_code,
      is_default: row.is_default,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      vendor_name: vendor?.name ?? null,
      vendor_legal_name: vendor?.legal_name ?? null,
    };
  });
}

export async function getVendorBankAccountById(
  id: string
): Promise<FinanceVendorBankAccount> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      `
        id,
        bank_id,
        vendor_id,
        vendor_code,
        beneficiary_name,
        bank_name,
        country,
        city,
        postal_code,
        address_line_1,
        address_line_2,
        account_number,
        account_identifier_type,
        account_identifier_value,
        currency_code,
        is_default,
        status,
        notes,
        created_at,
        updated_at,
        created_by,
        updated_by
      `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as FinanceVendorBankAccount;
}

export async function createVendorBankAccount(input: {
  vendor_id: string;
  beneficiary_name?: string | null;
  bank_name?: string | null;
  country?: string | null;
  city?: string | null;
  postal_code?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  account_number?: string | null;
  account_identifier_type?: string | null;
  account_identifier_value?: string | null;
  currency_code?: string | null;
  is_default?: boolean;
  status?: string | null;
  notes?: string | null;
}) {
  const userId = await getCurrentUserId();

  const payload = {
    vendor_id: input.vendor_id,
    beneficiary_name: normalizeNullable(input.beneficiary_name),
    bank_name: normalizeNullable(input.bank_name),
    country: normalizeNullable(input.country),
    city: normalizeNullable(input.city),
    postal_code: normalizeNullable(input.postal_code),
    address_line_1: normalizeNullable(input.address_line_1),
    address_line_2: normalizeNullable(input.address_line_2),
    account_number: normalizeNullable(input.account_number),
    account_identifier_type: normalizeIdentifierType(
      input.account_identifier_type
    ),
    account_identifier_value: normalizeNullable(input.account_identifier_value),
    currency_code: normalizeNullable(input.currency_code)?.toUpperCase() ?? null,
    is_default: Boolean(input.is_default),
    status: normalizeStatus(input.status),
    notes: normalizeNullable(input.notes),
    created_by: userId,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.vendor_bank_account.created",
    entityType: "finance_vendor_bank_account",
    entityId: data.id,
    message: `Vendor bank account created: ${data.bank_id}`,
  });

  return data as FinanceVendorBankAccount;
}

export async function updateVendorBankAccount(
  id: string,
  updates: Partial<FinanceVendorBankAccount>
): Promise<FinanceVendorBankAccount> {
  const userId = await getCurrentUserId();

  if (updates.is_default === true) {
    const targetVendorId =
      updates.vendor_id ??
      (await getVendorBankAccountById(id)).vendor_id;

    if (targetVendorId) {
      const { error: resetError } = await supabase
        .from(TABLE)
        .update({ is_default: false })
        .eq("vendor_id", targetVendorId);

      if (resetError) throw resetError;
    }
  }

  const nextUpdates: Partial<FinanceVendorBankAccount> = {
    ...updates,
    updated_by: userId,
  };

  if (typeof nextUpdates.beneficiary_name === "string") {
    nextUpdates.beneficiary_name = normalizeNullable(
      nextUpdates.beneficiary_name
    );
  }

  if (typeof nextUpdates.bank_name === "string") {
    nextUpdates.bank_name = normalizeNullable(nextUpdates.bank_name);
  }

  if (typeof nextUpdates.country === "string") {
    nextUpdates.country = normalizeNullable(nextUpdates.country);
  }

  if (typeof nextUpdates.city === "string") {
    nextUpdates.city = normalizeNullable(nextUpdates.city);
  }

  if (typeof nextUpdates.postal_code === "string") {
    nextUpdates.postal_code = normalizeNullable(nextUpdates.postal_code);
  }

  if (typeof nextUpdates.address_line_1 === "string") {
    nextUpdates.address_line_1 = normalizeNullable(nextUpdates.address_line_1);
  }

  if (typeof nextUpdates.address_line_2 === "string") {
    nextUpdates.address_line_2 = normalizeNullable(nextUpdates.address_line_2);
  }

  if (typeof nextUpdates.account_number === "string") {
    nextUpdates.account_number = normalizeNullable(nextUpdates.account_number);
  }

  if (typeof nextUpdates.account_identifier_type === "string") {
    nextUpdates.account_identifier_type = normalizeIdentifierType(
      nextUpdates.account_identifier_type
    );
  }

  if (typeof nextUpdates.account_identifier_value === "string") {
    nextUpdates.account_identifier_value = normalizeNullable(
      nextUpdates.account_identifier_value
    );
  }

  if (typeof nextUpdates.currency_code === "string") {
    nextUpdates.currency_code =
      normalizeNullable(nextUpdates.currency_code)?.toUpperCase() ?? null;
  }

  if (typeof nextUpdates.status === "string") {
    nextUpdates.status = normalizeStatus(nextUpdates.status);
  }

  if (typeof nextUpdates.notes === "string") {
    nextUpdates.notes = normalizeNullable(nextUpdates.notes);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(nextUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.vendor_bank_account.updated",
    entityType: "finance_vendor_bank_account",
    entityId: id,
    message: `Vendor bank account updated: ${data.bank_id}`,
  });

  return data as FinanceVendorBankAccount;
}

export async function archiveVendorBankAccount(
  id: string
): Promise<FinanceVendorBankAccount> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: "archived",
      updated_by: userId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.vendor_bank_account.archived",
    entityType: "finance_vendor_bank_account",
    entityId: id,
    message: `Vendor bank account archived: ${data.bank_id}`,
  });

  return data as FinanceVendorBankAccount;
}

export async function restoreVendorBankAccount(
  id: string
): Promise<FinanceVendorBankAccount> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: "active",
      updated_by: userId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.vendor_bank_account.restored",
    entityType: "finance_vendor_bank_account",
    entityId: id,
    message: `Vendor bank account restored: ${data.bank_id}`,
  });

  return data as FinanceVendorBankAccount;
}

export async function permanentlyDeleteVendorBankAccount(
  id: string
): Promise<void> {
  const existing = await getVendorBankAccountById(id);

  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;

  await logActivity({
    actionType: "finance.vendor_bank_account.deleted",
    entityType: "finance_vendor_bank_account",
    entityId: id,
    message: `Vendor bank account permanently deleted: ${existing.bank_id}`,
  });
}
