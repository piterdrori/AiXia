import { supabase } from "@/lib/supabase";
import type { FinanceVendor } from "./types";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_vendors";

/* =========================
   GET ALL VENDORS
========================= */
export async function getVendors(): Promise<FinanceVendor[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/* =========================
   CREATE VENDOR
========================= */
export async function createVendor(input: Partial<FinanceVendor>) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ...input,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.vendor.created",
    entityType: "finance_vendor",
    entityId: data.id,
    message: `Vendor created: ${data.name}`,
  });

  return data;
}

/* =========================
   UPDATE VENDOR
========================= */
export async function updateVendor(
  id: string,
  updates: Partial<FinanceVendor>
) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      ...updates,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.vendor.updated",
    entityType: "finance_vendor",
    entityId: id,
    message: `Vendor updated: ${data.name}`,
  });

  return data;
}

/* =========================
   ARCHIVE VENDOR
========================= */
export async function archiveVendor(id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: "archived",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.vendor.archived",
    entityType: "finance_vendor",
    entityId: id,
    message: `Vendor archived`,
  });

  return data;
}
