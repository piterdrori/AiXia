import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_bank_accounts";
const COMPANY_TABLE = "finance_companies";

export type FinanceBankAccountStatus = "active" | "inactive" | "archived";
export type FinanceBankIdentifierType = "swift" | "iban";

export type CompanyOption = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  currency_code: string | null;
};

export type FinanceBankAccount = {
  id: string;
  bank_id: string;
  company_id: string | null;
  company_code: string | null;
  beneficiary_name: string | null;
  bank_name: string | null;
  country: string | null;
  city: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  account_number: string | null;
  account_identifier_type: FinanceBankIdentifierType | null;
  account_identifier_value: string | null;
  currency_code: string | null;
  is_default: boolean;
  status: FinanceBankAccountStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type FinanceBankAccountListRow = Pick<
  FinanceBankAccount,
  | "id"
  | "bank_id"
  | "company_id"
  | "company_code"
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
  company_name: string | null;
  company_legal_name: string | null;
};

/* ========================= HELPERS ========================= */

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
): FinanceBankIdentifierType | null {
  const next = value?.trim().toLowerCase();
  if (next === "swift" || next === "iban") return next;
  return null;
}

function normalizeStatus(value?: string | null): FinanceBankAccountStatus {
  if (value === "inactive" || value === "archived") return value;
  return "active";
}

/* ========================= COMPANY OPTIONS ========================= */

export async function getCompanyOptions(): Promise<CompanyOption[]> {
  const { data, error } = await supabase
    .from(COMPANY_TABLE)
    .select("id, code, name, legal_name, currency_code")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CompanyOption[];
}

/* ========================= LIST ========================= */

export async function getBankAccounts(): Promise<FinanceBankAccountListRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      `
        id,
        bank_id,
        company_id,
        company_code,
        beneficiary_name,
        bank_name,
        country,
        city,
        currency_code,
        is_default,
        status,
        created_at,
        updated_at,
        finance_companies!finance_bank_accounts_company_id_fkey (
          name,
          legal_name
        )
      `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const company = Array.isArray(row.finance_companies)
      ? row.finance_companies[0]
      : row.finance_companies;

    return {
      id: row.id,
      bank_id: row.bank_id,
      company_id: row.company_id,
      company_code: row.company_code,
      beneficiary_name: row.beneficiary_name,
      bank_name: row.bank_name,
      country: row.country,
      city: row.city,
      currency_code: row.currency_code,
      is_default: row.is_default,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      company_name: company?.name ?? null,
      company_legal_name: company?.legal_name ?? null,
    };
  });
}

export async function getArchivedBankAccounts(): Promise<
  FinanceBankAccountListRow[]
> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      `
        id,
        bank_id,
        company_id,
        company_code,
        beneficiary_name,
        bank_name,
        country,
        city,
        currency_code,
        is_default,
        status,
        created_at,
        updated_at,
        finance_companies!finance_bank_accounts_company_id_fkey (
          name,
          legal_name
        )
      `
    )
    .eq("status", "archived")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const company = Array.isArray(row.finance_companies)
      ? row.finance_companies[0]
      : row.finance_companies;

    return {
      id: row.id,
      bank_id: row.bank_id,
      company_id: row.company_id,
      company_code: row.company_code,
      beneficiary_name: row.beneficiary_name,
      bank_name: row.bank_name,
      country: row.country,
      city: row.city,
      currency_code: row.currency_code,
      is_default: row.is_default,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      company_name: company?.name ?? null,
      company_legal_name: company?.legal_name ?? null,
    };
  });
}

/* ========================= GET BY ID ========================= */

export async function getBankAccountById(
  id: string
): Promise<FinanceBankAccount> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  const row = data as Record<string, unknown>;

  return {
    ...(data as FinanceBankAccount),
    account_number:
      (row.account_number as string | null | undefined) ??
      (row.masked_account_number as string | null | undefined) ??
      null,
  } as FinanceBankAccount;
}

/* ========================= CREATE ========================= */

export async function createBankAccount(input: {
  company_id?: string | null;
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
    company_id: input.company_id,
    beneficiary_name: normalizeNullable(input.beneficiary_name),
    bank_name: normalizeNullable(input.bank_name),
    country: normalizeNullable(input.country),
    city: normalizeNullable(input.city),
    postal_code: normalizeNullable(input.postal_code),
    address_line_1: normalizeNullable(input.address_line_1),
    address_line_2: normalizeNullable(input.address_line_2),
    masked_account_number: normalizeNullable(input.account_number),
    account_identifier_type: normalizeIdentifierType(
      input.account_identifier_type
    ),
    account_identifier_value: normalizeNullable(input.account_identifier_value),
    currency_code:
      normalizeNullable(input.currency_code)?.toUpperCase() ?? null,
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
  actionType: "finance.bank_account.created",
  entityType: "finance_bank_account",
  entityId: data.id,
  message: `Bank account created: ${data.bank_id}`,
});

const row = data as Record<string, unknown>;

return {
  ...(data as FinanceBankAccount),
  account_number:
    (row.account_number as string | null | undefined) ??
    (row.masked_account_number as string | null | undefined) ??
    null,
} as FinanceBankAccount;
}

/* ========================= UPDATE ========================= */

export async function updateBankAccount(
  id: string,
  updates: Partial<FinanceBankAccount>
): Promise<FinanceBankAccount> {
  const userId = await getCurrentUserId();

  // ensure only one default per company
if (updates.is_default === true) {
  const targetCompanyId =
    updates.company_id ??
    (await getBankAccountById(id)).company_id;

  if (targetCompanyId) {
    const { error: resetError } = await supabase
      .from(TABLE)
      .update({ is_default: false })
      .eq("company_id", targetCompanyId);

    if (resetError) throw resetError;
  }
}

  const nextUpdates: Partial<FinanceBankAccount> = {
    ...updates,
    updated_by: userId,
  };

  // normalization (critical parity with vendor system)
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
    nextUpdates.address_line_1 = normalizeNullable(
      nextUpdates.address_line_1
    );
  }

  if (typeof nextUpdates.address_line_2 === "string") {
    nextUpdates.address_line_2 = normalizeNullable(
      nextUpdates.address_line_2
    );
  }

  if (typeof nextUpdates.account_number === "string") {
  (nextUpdates as Record<string, unknown>).masked_account_number =
    normalizeNullable(nextUpdates.account_number);
  delete (nextUpdates as Partial<FinanceBankAccount>).account_number;
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
  actionType: "finance.bank_account.updated",
  entityType: "finance_bank_account",
  entityId: id,
  message: `Bank account updated: ${data.bank_id}`,
});

const row = data as Record<string, unknown>;

return {
  ...(data as FinanceBankAccount),
  account_number:
    (row.account_number as string | null | undefined) ??
    (row.masked_account_number as string | null | undefined) ??
    null,
} as FinanceBankAccount;
}

/* ========================= ARCHIVE ========================= */

export async function archiveBankAccount(
  id: string
): Promise<FinanceBankAccount> {
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
    actionType: "finance.bank_account.archived",
    entityType: "finance_bank_account",
    entityId: id,
    message: `Bank account archived: ${data.bank_id}`,
  });

  return data as FinanceBankAccount;
}

/* ========================= RESTORE ========================= */

export async function restoreBankAccount(
  id: string
): Promise<FinanceBankAccount> {
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
    actionType: "finance.bank_account.restored",
    entityType: "finance_bank_account",
    entityId: id,
    message: `Bank account restored: ${data.bank_id}`,
  });

  return data as FinanceBankAccount;
}

/* ========================= DELETE ========================= */

export async function permanentlyDeleteBankAccount(
  id: string
): Promise<void> {
  const existing = await getBankAccountById(id);

  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;

  await logActivity({
    actionType: "finance.bank_account.deleted",
    entityType: "finance_bank_account",
    entityId: id,
    message: `Bank account permanently deleted: ${existing.bank_id}`,
  });
}
