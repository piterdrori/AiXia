import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const CURRENCY_TABLE = "finance_currencies";
const RATE_TABLE = "finance_exchange_rates";

export type FinanceRecordStatus = "active" | "inactive" | "archived";

export type FinanceCurrencyRow = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  status: FinanceRecordStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceExchangeRateRow = {
  id: string;
  from_currency_code: string;
  to_currency_code: string;
  exchange_rate: string;
  effective_date: string;
  status: FinanceRecordStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CurrencyUpsertInput = {
  currency_code: string;
  currency_name: string;
  currency_symbol?: string | null;
  decimal_places?: number | null;
  is_base_currency?: boolean;
  status?: FinanceRecordStatus;
  notes?: string | null;
};

export type ExchangeRateUpsertInput = {
  from_currency_code: string;
  to_currency_code: string;
  exchange_rate: string;
  effective_date: string;
  status?: FinanceRecordStatus;
  notes?: string | null;
};

export type CurrencyRateCoverageRow = {
  from_currency_code: string;
  pair_count: number;
};

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function normalizeRequiredText(value: string) {
  return value.trim();
}

function normalizeNullable(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function getCurrencies(): Promise<FinanceCurrencyRow[]> {
  const { data, error } = await supabase
    .from(CURRENCY_TABLE)
    .select(
      "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status, notes, created_at, updated_at",
    )
    .order("is_base_currency", { ascending: false })
    .order("currency_code", { ascending: true });

  if (error) throw error;

  return (data ?? []) as FinanceCurrencyRow[];
}

export async function getArchivedCurrencies(): Promise<FinanceCurrencyRow[]> {
  const { data, error } = await supabase
    .from(CURRENCY_TABLE)
    .select(
      "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status, notes, created_at, updated_at",
    )
    .eq("status", "archived")
    .order("updated_at", { ascending: false })
    .order("currency_code", { ascending: true });

  if (error) throw error;

  return (data ?? []) as FinanceCurrencyRow[];
}

export async function getExchangeRates(): Promise<FinanceExchangeRateRow[]> {
  const { data, error } = await supabase
    .from(RATE_TABLE)
    .select(
      "id, from_currency_code, to_currency_code, exchange_rate, effective_date, status, notes, created_at, updated_at",
    )
    .order("effective_date", { ascending: false })
    .order("from_currency_code", { ascending: true })
    .order("to_currency_code", { ascending: true });

  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }

  return (data ?? []) as FinanceExchangeRateRow[];
}

export async function getCurrencyRateCoverage(): Promise<CurrencyRateCoverageRow[]> {
  const { data, error } = await supabase
    .from(RATE_TABLE)
    .select("from_currency_code")
    .eq("status", "active");

  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }

  const grouped = new Map<string, number>();

  for (const row of (data ?? []) as Array<{ from_currency_code: string | null }>) {
    const code = row.from_currency_code?.trim().toUpperCase();
    if (!code) continue;
    grouped.set(code, (grouped.get(code) ?? 0) + 1);
  }

  return Array.from(grouped.entries())
    .map(([from_currency_code, pair_count]) => ({
      from_currency_code,
      pair_count,
    }))
    .sort((a, b) => a.from_currency_code.localeCompare(b.from_currency_code));
}

export async function createCurrency(input: CurrencyUpsertInput) {
  const userId = await getCurrentUserId();

  const payload = {
    currency_code: normalizeCode(input.currency_code),
    currency_name: normalizeRequiredText(input.currency_name),
    currency_symbol: normalizeNullable(input.currency_symbol),
    decimal_places: input.decimal_places ?? 2,
    is_base_currency: input.is_base_currency ?? false,
    status: input.status ?? "active",
    notes: normalizeNullable(input.notes),
    metadata: {},
    created_by: userId,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from(CURRENCY_TABLE)
    .insert(payload)
    .select(
      "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status, notes, created_at, updated_at",
    )
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.currency.created",
    entityType: "finance_currency",
    entityId: data.id,
    message: `Currency created: ${data.currency_code}`,
  });

  return data as FinanceCurrencyRow;
}

export async function updateCurrency(id: string, input: CurrencyUpsertInput) {
  const userId = await getCurrentUserId();

  const payload = {
    currency_code: normalizeCode(input.currency_code),
    currency_name: normalizeRequiredText(input.currency_name),
    currency_symbol: normalizeNullable(input.currency_symbol),
    decimal_places: input.decimal_places ?? 2,
    is_base_currency: input.is_base_currency ?? false,
    status: input.status ?? "active",
    notes: normalizeNullable(input.notes),
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from(CURRENCY_TABLE)
    .update(payload)
    .eq("id", id)
    .select(
      "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status, notes, created_at, updated_at",
    )
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.currency.updated",
    entityType: "finance_currency",
    entityId: id,
    message: `Currency updated: ${data.currency_code}`,
  });

  return data as FinanceCurrencyRow;
}

export async function archiveCurrency(id: string) {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(CURRENCY_TABLE)
    .update({ status: "archived", updated_by: userId })
    .eq("id", id)
    .select("id, currency_code, status, updated_at")
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.currency.archived",
    entityType: "finance_currency",
    entityId: id,
    message: `Currency archived: ${data.currency_code}`,
  });

  return data;
}

export async function restoreCurrency(id: string) {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(CURRENCY_TABLE)
    .update({ status: "active", updated_by: userId })
    .eq("id", id)
    .select("id, currency_code, status, updated_at")
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.currency.restored",
    entityType: "finance_currency",
    entityId: id,
    message: `Currency restored: ${data.currency_code}`,
  });

  return data;
}

export async function permanentlyDeleteCurrency(id: string) {
  const { data: existing, error: readError } = await supabase
    .from(CURRENCY_TABLE)
    .select("id, currency_code")
    .eq("id", id)
    .single();

  if (readError) throw readError;

  const { error } = await supabase.rpc("finance_permanently_delete_currency", {
    p_currency_id: id,
  });

  if (error) throw error;

  await logActivity({
    actionType: "finance.currency.deleted",
    entityType: "finance_currency",
    entityId: id,
    message: `Currency permanently deleted: ${existing.currency_code}`,
  });
}

export async function createExchangeRate(input: ExchangeRateUpsertInput) {
  const userId = await getCurrentUserId();

  const payload = {
    from_currency_code: normalizeCode(input.from_currency_code),
    to_currency_code: normalizeCode(input.to_currency_code),
    exchange_rate: normalizeRequiredText(input.exchange_rate),
    effective_date: input.effective_date,
    status: input.status ?? "active",
    notes: normalizeNullable(input.notes),
    metadata: {},
    created_by: userId,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from(RATE_TABLE)
    .insert(payload)
    .select(
      "id, from_currency_code, to_currency_code, exchange_rate, effective_date, status, notes, created_at, updated_at",
    )
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.exchange_rate.created",
    entityType: "finance_exchange_rate",
    entityId: data.id,
    message: `Exchange rate created: ${data.from_currency_code} to ${data.to_currency_code}`,
  });

  return data as FinanceExchangeRateRow;
}

export async function updateExchangeRate(
  id: string,
  input: ExchangeRateUpsertInput
) {
  const userId = await getCurrentUserId();

  const payload = {
    from_currency_code: normalizeCode(input.from_currency_code),
    to_currency_code: normalizeCode(input.to_currency_code),
    exchange_rate: normalizeRequiredText(input.exchange_rate),
    effective_date: input.effective_date,
    status: input.status ?? "active",
    notes: normalizeNullable(input.notes),
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from(RATE_TABLE)
    .update(payload)
    .eq("id", id)
    .select(
      "id, from_currency_code, to_currency_code, exchange_rate, effective_date, status, notes, created_at, updated_at",
    )
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.exchange_rate.updated",
    entityType: "finance_exchange_rate",
    entityId: id,
    message: `Exchange rate updated: ${data.from_currency_code} to ${data.to_currency_code}`,
  });

  return data as FinanceExchangeRateRow;
}

export async function archiveExchangeRate(id: string) {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(RATE_TABLE)
    .update({ status: "archived", updated_by: userId })
    .eq("id", id)
    .select("id, from_currency_code, to_currency_code, status, updated_at")
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.exchange_rate.archived",
    entityType: "finance_exchange_rate",
    entityId: id,
    message: `Exchange rate archived: ${data.from_currency_code} to ${data.to_currency_code}`,
  });

  return data;
}

export async function restoreExchangeRate(id: string) {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(RATE_TABLE)
    .update({ status: "active", updated_by: userId })
    .eq("id", id)
    .select("id, from_currency_code, to_currency_code, status, updated_at")
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.exchange_rate.restored",
    entityType: "finance_exchange_rate",
    entityId: id,
    message: `Exchange rate restored: ${data.from_currency_code} to ${data.to_currency_code}`,
  });

  return data;
}

export async function permanentlyDeleteExchangeRate(id: string) {
  const { data: existing, error: readError } = await supabase
    .from(RATE_TABLE)
    .select("id, from_currency_code, to_currency_code")
    .eq("id", id)
    .single();

  if (readError) throw readError;

  const { error } = await supabase.rpc(
    "finance_permanently_delete_exchange_rate",
    {
      p_exchange_rate_id: id,
    },
  );

  if (error) throw error;

  await logActivity({
    actionType: "finance.exchange_rate.deleted",
    entityType: "finance_exchange_rate",
    entityId: id,
    message: `Exchange rate permanently deleted: ${existing.from_currency_code} to ${existing.to_currency_code}`,
  });
}
