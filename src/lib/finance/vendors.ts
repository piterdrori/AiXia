import { supabase } from "@/lib/supabase";
import type { FinanceVendor, FinanceRecordStatus } from "./types";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_vendors";

export type FinanceVendorListRow = Pick<
  FinanceVendor,
  | "id"
  | "code"
  | "name"
  | "legal_name"
  | "status"
  | "company_email"
  | "personnel_email"
  | "company_phone"
  | "personnel_phone"
  | "company_related_personnel"
  | "country"
  | "created_at"
  | "updated_at"
>;

export async function getVendors(): Promise<FinanceVendorListRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      `
        id,
        code,
        name,
        legal_name,
        status,
        company_email,
        personnel_email,
        company_phone,
        personnel_phone,
        company_related_personnel,
        country,
        created_at,
        updated_at
      `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FinanceVendorListRow[];
}

export async function getArchivedVendors(): Promise<FinanceVendorListRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      `
        id,
        code,
        name,
        legal_name,
        status,
        company_email,
        personnel_email,
        company_phone,
        personnel_phone,
        company_related_personnel,
        country,
        created_at,
        updated_at
      `
    )
    .eq("status", "archived")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FinanceVendorListRow[];
}

export async function createVendor(input: {
  legal_name: string;
  contact_name?: string | null;
  company_related_personnel?: string | null;
  status?: FinanceRecordStatus;
  company_email?: string | null;
  personnel_email?: string | null;
  company_phone?: string | null;
  personnel_phone?: string | null;
  country?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  shipping_address_line_1?: string | null;
  shipping_address_line_2?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const normalizedLegalName = input.legal_name.trim();
  const normalizedContactName = input.contact_name?.trim() || null;

  const payload = {
    name: normalizedLegalName,
    legal_name: normalizedLegalName,
    contact_person: normalizedContactName,
    company_related_personnel: input.company_related_personnel?.trim() || null,
    status: input.status ?? "active",
    company_email: input.company_email?.trim() || null,
    personnel_email: input.personnel_email?.trim() || null,
    company_phone: input.company_phone?.trim() || null,
    personnel_phone: input.personnel_phone?.trim() || null,
    country: input.country?.trim() || null,
    address_line_1: input.address_line_1?.trim() || null,
    address_line_2: input.address_line_2?.trim() || null,
    shipping_address_line_1: input.shipping_address_line_1?.trim() || null,
    shipping_address_line_2: input.shipping_address_line_2?.trim() || null,
    notes: input.notes?.trim() || null,
    metadata: input.metadata ?? {},
    created_by: user?.id ?? null,
    updated_by: user?.id ?? null,
  };
  
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.vendor.created",
    entityType: "finance_vendor",
    entityId: data.id,
    message: `Vendor created: ${data.legal_name ?? data.name}`,
  });

  return data as FinanceVendor;
}

export async function updateVendor(
  id: string,
  updates: Partial<FinanceVendor>
): Promise<FinanceVendor> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextUpdates: Partial<FinanceVendor> = {
    ...updates,
    updated_by: user?.id ?? null,
  };

  if (typeof nextUpdates.legal_name === "string") {
    const normalizedLegalName = nextUpdates.legal_name.trim();
    nextUpdates.legal_name = normalizedLegalName;
    nextUpdates.name = normalizedLegalName;
  }

  if (typeof nextUpdates.contact_person === "string") {
    nextUpdates.contact_person = nextUpdates.contact_person.trim();
  }

  if (typeof nextUpdates.company_related_personnel === "string") {
    nextUpdates.company_related_personnel =
      nextUpdates.company_related_personnel.trim();
  }

  if (typeof nextUpdates.company_email === "string") {
    nextUpdates.company_email = nextUpdates.company_email.trim();
  }

  if (typeof nextUpdates.personnel_email === "string") {
    nextUpdates.personnel_email = nextUpdates.personnel_email.trim();
  }

  if (typeof nextUpdates.company_phone === "string") {
    nextUpdates.company_phone = nextUpdates.company_phone.trim();
  }

  if (typeof nextUpdates.personnel_phone === "string") {
    nextUpdates.personnel_phone = nextUpdates.personnel_phone.trim();
  }

  if (typeof nextUpdates.country === "string") {
    nextUpdates.country = nextUpdates.country.trim();
  }

  if (typeof nextUpdates.address_line_1 === "string") {
    nextUpdates.address_line_1 = nextUpdates.address_line_1.trim();
  }

  if (typeof nextUpdates.address_line_2 === "string") {
    nextUpdates.address_line_2 = nextUpdates.address_line_2.trim();
  }

  if (typeof nextUpdates.shipping_address_line_1 === "string") {
    nextUpdates.shipping_address_line_1 =
      nextUpdates.shipping_address_line_1.trim();
  }

  if (typeof nextUpdates.shipping_address_line_2 === "string") {
    nextUpdates.shipping_address_line_2 =
      nextUpdates.shipping_address_line_2.trim();
  }


  const { data, error } = await supabase
    .from(TABLE)
    .update(nextUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.vendor.updated",
    entityType: "finance_vendor",
    entityId: id,
    message: `Vendor updated: ${data.legal_name ?? data.name}`,
  });

  return data as FinanceVendor;
}

export async function archiveVendor(id: string): Promise<FinanceVendor> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: "archived",
      updated_by: user?.id ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.vendor.archived",
    entityType: "finance_vendor",
    entityId: id,
    message: "Vendor archived",
  });

  return data as FinanceVendor;
}

export async function restoreVendor(id: string): Promise<FinanceVendor> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: "active",
      updated_by: user?.id ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.vendor.restored",
    entityType: "finance_vendor",
    entityId: id,
    message: "Vendor restored from archive",
  });

  return data as FinanceVendor;
}

export async function permanentlyDeleteVendor(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;

  await logActivity({
    actionType: "finance.vendor.deleted",
    entityType: "finance_vendor",
    entityId: id,
    message: "Vendor permanently deleted",
  });
}
