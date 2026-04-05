import { supabase } from "@/lib/supabase";
import { FinanceRevenueCategory } from "./types";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_revenue_categories";

/* =========================
   GET ALL REVENUE CATEGORIES
========================= */
export async function getRevenueCategories(): Promise<FinanceRevenueCategory[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/* =========================
   CREATE REVENUE CATEGORY
========================= */
export async function createRevenueCategory(
  input: Partial<FinanceRevenueCategory>
) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ...input,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.revenue_category.created",
    entityType: "finance_revenue_category",
    entityId: data.id,
    message: `Revenue category created: ${data.name}`,
  });

  return data;
}

/* =========================
   UPDATE REVENUE CATEGORY
========================= */
export async function updateRevenueCategory(
  id: string,
  updates: Partial<FinanceRevenueCategory>
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
    actionType: "finance.revenue_category.updated",
    entityType: "finance_revenue_category",
    entityId: id,
    message: `Revenue category updated: ${data.name}`,
  });

  return data;
}

/* =========================
   ARCHIVE REVENUE CATEGORY
========================= */
export async function archiveRevenueCategory(id: string) {
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
    actionType: "finance.revenue_category.archived",
    entityType: "finance_revenue_category",
    entityId: id,
    message: `Revenue category archived`,
  });

  return data;
}
