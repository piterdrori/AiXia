import { supabase } from "@/lib/supabase";
import { FinanceRecordAttachment } from "./types";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_record_attachments";

/* =========================
   GET ATTACHMENTS
========================= */
export async function getFinanceAttachments(
  entityType: string,
  entityId: string
): Promise<FinanceRecordAttachment[]> {
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
   LINK FILE TO FINANCE RECORD
========================= */
export async function attachFileToFinanceRecord(input: {
  entity_type: string;
  entity_id: string;
  file_upload_id: string;
  uploaded_by?: string | null;
}) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      file_upload_id: input.file_upload_id,
      uploaded_by: input.uploaded_by ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.attachment.added",
    entityType: "finance_attachment",
    entityId: data.id,
    message: `Finance attachment added`,
  });

  return data;
}

/* =========================
   REMOVE ATTACHMENT
========================= */
export async function removeFinanceAttachment(id: string) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id);

  if (error) throw error;

  await logActivity({
    actionType: "finance.attachment.removed",
    entityType: "finance_attachment",
    entityId: id,
    message: `Finance attachment removed`,
  });
}
