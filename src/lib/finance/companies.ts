import { supabase } from "@/lib/supabase";
import type { FinanceRecordStatus } from "./types";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_companies";

export type FinanceCompany = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  status: FinanceRecordStatus;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  country: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  currency_code: string | null;
  company_code: string | null;
  registration_number: string | null;
  tax_number: string | null;
  website: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  project_id: string | null;
  task_id: string | null;
  reference_number: string | null;
  posted_to_ledger: boolean;
};

export type FinanceCompanyListRow = Pick<
  FinanceCompany,
  | "id"
  | "code"
  | "name"
  | "legal_name"
  | "status"
  | "email"
  | "phone"
  | "contact_person"
  | "country"
  | "city"
  | "currency_code"
  | "company_code"
  | "created_at"
  | "updated_at"
>;

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function getCompanies(): Promise<FinanceCompanyListRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      `
        id,
        code,
        name,
        legal_name,
        status,
        email,
        phone,
        contact_person,
        country,
        city,
        currency_code,
        company_code,
        created_at,
        updated_at
      `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FinanceCompanyListRow[];
}

export async function getArchivedCompanies(): Promise<FinanceCompanyListRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      `
        id,
        code,
        name,
        legal_name,
        status,
        email,
        phone,
        contact_person,
        country,
        city,
        currency_code,
        company_code,
        created_at,
        updated_at
      `
    )
    .eq("status", "archived")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FinanceCompanyListRow[];
}

export async function createCompany(input: {
  legal_name: string;
  name?: string | null;
  contact_person?: string | null;
  status?: FinanceRecordStatus;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  currency_code?: string | null;
  company_code?: string | null;
  registration_number?: string | null;
  tax_number?: string | null;
  website?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const userId = await getCurrentUserId();

  const normalizedLegalName = input.legal_name.trim();
  const normalizedName = input.name?.trim() || normalizedLegalName;

  const payload = {
    name: normalizedName,
    legal_name: normalizedLegalName,
    contact_person: input.contact_person?.trim() || null,
    status: input.status ?? "active",
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    country: input.country?.trim() || null,
    city: input.city?.trim() || null,
    state_province: input.state_province?.trim() || null,
    postal_code: input.postal_code?.trim() || null,
    address_line_1: input.address_line_1?.trim() || null,
    address_line_2: input.address_line_2?.trim() || null,
    currency_code: input.currency_code?.trim() || null,
    company_code: input.company_code?.trim() || null,
    registration_number: input.registration_number?.trim() || null,
    tax_number: input.tax_number?.trim() || null,
    website: input.website?.trim() || null,
    notes: input.notes?.trim() || null,
    metadata: input.metadata ?? {},
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
    actionType: "finance.company.created",
    entityType: "finance_company",
    entityId: data.id,
    message: `Company created: ${data.legal_name ?? data.name}`,
  });

  return data as FinanceCompany;
}
export async function updateCompany(
  id: string,
  updates: Partial<FinanceCompany>
): Promise<FinanceCompany> {
  const userId = await getCurrentUserId();

  const nextUpdates: Partial<FinanceCompany> = {
    ...updates,
    updated_by: userId,
  };

  if (typeof nextUpdates.legal_name === "string") {
    const normalizedLegalName = nextUpdates.legal_name.trim();
    nextUpdates.legal_name = normalizedLegalName;

    if (!nextUpdates.name || !String(nextUpdates.name).trim()) {
      nextUpdates.name = normalizedLegalName;
    }
  }

  if (typeof nextUpdates.name === "string") {
    nextUpdates.name = nextUpdates.name.trim();
  }

  if (typeof nextUpdates.contact_person === "string") {
    nextUpdates.contact_person = nextUpdates.contact_person.trim();
  }

  if (typeof nextUpdates.email === "string") {
    nextUpdates.email = nextUpdates.email.trim();
  }

  if (typeof nextUpdates.phone === "string") {
    nextUpdates.phone = nextUpdates.phone.trim();
  }

  if (typeof nextUpdates.country === "string") {
    nextUpdates.country = nextUpdates.country.trim();
  }

  if (typeof nextUpdates.city === "string") {
    nextUpdates.city = nextUpdates.city.trim();
  }

  if (typeof nextUpdates.state_province === "string") {
    nextUpdates.state_province = nextUpdates.state_province.trim();
  }

  if (typeof nextUpdates.postal_code === "string") {
    nextUpdates.postal_code = nextUpdates.postal_code.trim();
  }

  if (typeof nextUpdates.address_line_1 === "string") {
    nextUpdates.address_line_1 = nextUpdates.address_line_1.trim();
  }

  if (typeof nextUpdates.address_line_2 === "string") {
    nextUpdates.address_line_2 = nextUpdates.address_line_2.trim();
  }

  if (typeof nextUpdates.currency_code === "string") {
    nextUpdates.currency_code = nextUpdates.currency_code.trim();
  }

  if (typeof nextUpdates.company_code === "string") {
    nextUpdates.company_code = nextUpdates.company_code.trim();
  }

  if (typeof nextUpdates.registration_number === "string") {
    nextUpdates.registration_number = nextUpdates.registration_number.trim();
  }

  if (typeof nextUpdates.tax_number === "string") {
    nextUpdates.tax_number = nextUpdates.tax_number.trim();
  }

  if (typeof nextUpdates.website === "string") {
    nextUpdates.website = nextUpdates.website.trim();
  }

  if (typeof nextUpdates.notes === "string") {
    nextUpdates.notes = nextUpdates.notes.trim();
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(nextUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.company.updated",
    entityType: "finance_company",
    entityId: id,
    message: `Company updated: ${data.legal_name ?? data.name}`,
  });

  return data as FinanceCompany;
}

export async function archiveCompany(id: string): Promise<FinanceCompany> {
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
    actionType: "finance.company.archived",
    entityType: "finance_company",
    entityId: id,
    message: "Company archived",
  });

  return data as FinanceCompany;
}

export async function restoreCompany(id: string): Promise<FinanceCompany> {
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
    actionType: "finance.company.restored",
    entityType: "finance_company",
    entityId: id,
    message: "Company restored from archive",
  });

  return data as FinanceCompany;
}

export async function permanentlyDeleteCompany(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;

  await logActivity({
    actionType: "finance.company.deleted",
    entityType: "finance_company",
    entityId: id,
    message: "Company permanently deleted",
  });
}
