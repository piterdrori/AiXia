import { supabase } from "@/lib/supabase";
import type { FinanceSetting } from "./types";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_settings";

/* =========================
   GET SETTINGS
========================= */
export async function getFinanceSettings(): Promise<FinanceSetting[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/* =========================
   UPSERT SETTING
========================= */
export async function upsertFinanceSetting(
  key: string,
  value: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({
      settings_key: key,
      settings_value: value,
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.settings.updated",
    entityType: "finance_setting",
    entityId: data.id,
    message: `Finance settings updated: ${key}`,
  });

  return data;
}
