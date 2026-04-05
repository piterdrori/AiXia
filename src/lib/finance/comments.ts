import { supabase } from "@/lib/supabase";
import type { FinanceComment } from "./types";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_comments";

/* =========================
   GET COMMENTS FOR ENTITY
========================= */
export async function getFinanceComments(
  entityType: string,
  entityId: string
): Promise<FinanceComment[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/* =========================
   CREATE COMMENT
========================= */
export async function createFinanceComment(input: {
  entity_type: string;
  entity_id: string;
  user_id?: string | null;
  comment: string;
}) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      user_id: input.user_id ?? null,
      comment: input.comment,
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.comment.added",
    entityType: "finance_comment",
    entityId: data.id,
    message: `Finance comment added`,
  });

  return data;
}
