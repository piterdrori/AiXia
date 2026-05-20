import { supabase } from "@/lib/supabase";

export type FinanceNotificationEvent =
  | "expense_approved"
  | "expense_rejected"
  | "expense_more_info"
  | "expense_verified"
  | "finance_general";

export type EmitFinanceNotificationInput = {
  userId: string;
  actorUserId?: string;
  event: FinanceNotificationEvent;
  title: string;
  message?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
};

export async function emitFinanceNotification(input: EmitFinanceNotificationInput) {
  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    actor_user_id: input.actorUserId || null,
    type: "REMINDER",
    title: input.title,
    message: input.message || null,
    link: input.link || null,
    entity_type: input.entityType || "finance",
    entity_id: input.entityId || null,
  });

  if (error) {
    console.error("emitFinanceNotification error:", error);
  }

  return { error };
}
