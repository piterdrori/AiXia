import { format, isToday, isYesterday } from "date-fns";
import type {
  ChatGroupMemberRow,
  ChatGroupRow,
  ChatMessageRow,
  ConversationBuckets,
  ProfileRow,
} from "./types";

export const PAGE_SIZE = 20;
export const NEAR_BOTTOM_PX = 120;

type TranslateFn = (
  key: string,
  fallback?: string,
  params?: Record<string, string | number>
) => string;

export function buildDirectKey(a: string, b: string) {
  return [a, b].sort().join("__");
}

export function sortMessagesAscending(items: ChatMessageRow[]) {
  return [...items].sort((a, b) => {
    const timeDiff =
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });
}

export function dedupeMessages(items: ChatMessageRow[]) {
  const map = new Map<string, ChatMessageRow>();

  for (const item of items) {
    map.set(item.id, item);
  }

  return sortMessagesAscending(Array.from(map.values()));
}

export function formatMessageTime(value: string, t?: TranslateFn) {
  const date = new Date(value);

  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date))
    return `${t ? t("chat.time.yesterday") : "Yesterday"} ${format(date, "HH:mm")}`;
  return format(date, "MMM d, HH:mm");
}

export function getProfileByUserId(
  profiles: ProfileRow[],
  userId: string | null | undefined
) {
  if (!userId) return null;
  return profiles.find((profile) => profile.user_id === userId) || null;
}

export function getMembersForGroup(
  groupMembers: ChatGroupMemberRow[],
  groupId: string
) {
  return groupMembers.filter((member) => member.group_id === groupId);
}

export function getConversationName(
  group: ChatGroupRow,
  currentUserId: string | null,
  profiles: ProfileRow[],
  groupMembers: ChatGroupMemberRow[],
  t?: TranslateFn
) {
  if (group.name) return group.name;

  const members = getMembersForGroup(groupMembers, group.id);

  if (group.type === "DIRECT") {
    const otherMember = members.find((member) => member.user_id !== currentUserId);
    const otherProfile = getProfileByUserId(profiles, otherMember?.user_id);
    return otherProfile?.full_name || (t ? t("chat.fallbacks.directChat") : "Direct Chat");
  }

  if (group.type === "PROJECT") return t ? t("chat.fallbacks.projectChat") : "Project Chat";
  if (group.type === "TASK") return t ? t("chat.fallbacks.taskChat") : "Task Chat";
  return t ? t("chat.fallbacks.groupChat") : "Group Chat";
}

export function getConversationInitials(
  group: ChatGroupRow,
  currentUserId: string | null,
  profiles: ProfileRow[],
  groupMembers: ChatGroupMemberRow[],
  t?: TranslateFn
) {
  const name = getConversationName(group, currentUserId, profiles, groupMembers, t);

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getUserInitials(fullName: string | null | undefined) {
  return (fullName || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function bucketConversations(
  groups: ChatGroupRow[],
  searchQuery: string,
  currentUserId: string | null,
  profiles: ProfileRow[],
  groupMembers: ChatGroupMemberRow[],
  t?: TranslateFn
): ConversationBuckets {
  const q = searchQuery.trim().toLowerCase();

  const filtered = groups.filter((group) =>
    getConversationName(group, currentUserId, profiles, groupMembers, t)
      .toLowerCase()
      .includes(q)
  );

  return {
    direct: filtered.filter((group) => group.type === "DIRECT"),
    project: filtered.filter((group) => group.type === "PROJECT"),
    task: filtered.filter((group) => group.type === "TASK"),
    group: filtered.filter((group) => group.type === "GROUP"),
  };
}
