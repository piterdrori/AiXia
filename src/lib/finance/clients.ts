import { supabase } from "@/lib/supabase";
import { FinanceClient } from "./types";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_clients";

/* =========================
   GET ALL CLIENTS
========================= */
export async function getClients(): Promise<FinanceClient[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/* =========================
   CREATE CLIENT
========================= */
export async function createClient(input: Partial<FinanceClient>) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ...input,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.client.created",
    entityType: "finance_client",
    entityId: data.id,
    message: `Client created: ${data.name}`,
  });

  return data;
}

/* =========================
   UPDATE CLIENT
========================= */
export async function updateClient(
  id: string,
  updates: Partial<FinanceClient>
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
    actionType: "finance.client.updated",
    entityType: "finance_client",
    entityId: id,
    message: `Client updated: ${data.name}`,
  });

  return data;
}

/* =========================
   ARCHIVE CLIENT
========================= */
export async function archiveClient(id: string) {
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
    actionType: "finance.client.archived",
    entityType: "finance_client",
    entityId: id,
    message: `Client archived`,
  });

  return data;
}
