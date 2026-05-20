import { supabase } from "@/lib/supabase";

export type NotificationType =
  | "MESSAGE"
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "COMMENT"
  | "FILE_UPLOAD"
  | "PROJECT_UPDATE"
  | "MENTION"
  | "REMINDER";

export type NotificationRow = {
  id: string;
  user_id: string;
  actor_user_id: string | null;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};

const KNOWN_NOTIFICATION_TYPES = new Set<string>([
  "MESSAGE",
  "TASK_ASSIGNED",
  "TASK_UPDATED",
  "COMMENT",
  "MENTION",
  "FILE_UPLOAD",
  "PROJECT_UPDATE",
  "REMINDER",
]);

export function isKnownNotificationType(
  value: string
): value is NotificationType {
  return KNOWN_NOTIFICATION_TYPES.has(value);
}

export function normalizeNotificationRows(
  data: unknown[] | null | undefined
): NotificationRow[] {
  return (data || []).filter((item): item is NotificationRow => {
    if (!item || typeof item !== "object") return false;
    const row = item as NotificationRow;
    return (
      typeof row.id === "string" &&
      typeof row.user_id === "string" &&
      typeof row.title === "string" &&
      typeof row.created_at === "string" &&
      typeof row.is_read === "boolean" &&
      typeof row.type === "string"
    );
  });
}

export interface CreateNotificationInput {
  userId: string;
  actorUserId?: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    actor_user_id: input.actorUserId || null,
    type: input.type,
    title: input.title,
    message: input.message || null,
    link: input.link || null,
    entity_type: input.entityType || null,
    entity_id: input.entityId || null,
  });

  if (error) {
    console.error("Create notification error:", error);
  }
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) {
    console.error("Mark notification read error:", error);
  }
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("Mark all notifications read error:", error);
  }
}

export async function getUnreadNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch notifications error:", error);
    return [];
  }

  return data || [];
}

export function extractMentionedUserIds(
  text: string,
  profiles: Array<{ user_id: string; full_name: string | null }>
) {
  const lowerText = text.toLowerCase();
  const mentionedIds = new Set<string>();

  for (const profile of profiles) {
    const fullName = (profile.full_name || "").trim();
    if (!fullName) continue;

    const parts = fullName.split(/\s+/).filter(Boolean);
    const firstName = parts[0]?.toLowerCase();
    const fullNameLower = fullName.toLowerCase();

    if (firstName && lowerText.includes(`@${firstName}`)) {
      mentionedIds.add(profile.user_id);
    }

    if (fullNameLower && lowerText.includes(`@${fullNameLower}`)) {
      mentionedIds.add(profile.user_id);
    }
  }

  return Array.from(mentionedIds);
}
