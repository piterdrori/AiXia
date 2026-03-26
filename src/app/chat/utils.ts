// utils.ts
import { format, isToday, isYesterday } from "date-fns";

export const PAGE_SIZE = 20;
export const NEAR_BOTTOM_PX = 120;

export function buildDirectKey(a: string, b: string) {
  return [a, b].sort().join("__");
}

export function sortMessagesAscending(items: any[]) {
  return [...items].sort((a, b) => {
    const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });
}

export function dedupeMessages(items: any[]) {
  const map = new Map<string, any>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return sortMessagesAscending(Array.from(map.values()));
}

export function formatMessageTime(value: string) {
  const date = new Date(value);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return `Yesterday ${format(date, "HH:mm")}`;
  return format(date, "MMM d, HH:mm");
}

export function formatLastMessageTime(value: string) {
  const date = new Date(value);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

export function getProfileByUserId(profiles: any[], userId: string | null | undefined) {
  if (!userId) return null;
  return profiles.find((profile) => profile.user_id === userId) || null;
}

export function getMembersForGroup(groupMembers: any[], groupId: string) {
  return groupMembers.filter((member) => member.group_id === groupId);
}

export function getConversationName(
  group: any,
  currentUserId: string | null,
  profiles: any[],
  groupMembers: any[]
) {
  if (group.name) return group.name;
  const members = getMembersForGroup(groupMembers, group.id);
  
  if (group.type === "DIRECT") {
    const otherMember = members.find((m) => m.user_id !== currentUserId);
    const otherProfile = getProfileByUserId(profiles, otherMember?.user_id);
    return otherProfile?.full_name || "Direct Chat";
  }
  if (group.type === "PROJECT") return "Project Chat";
  if (group.type === "TASK") return "Task Chat";
  return "Group Chat";
}

export function getConversationInitials(
  group: any,
  currentUserId: string | null,
  profiles: any[],
  groupMembers: any[]
) {
  const name = getConversationName(group, currentUserId, profiles, groupMembers);
  return name.split(" ").map((part: string) => part[0]).join("").toUpperCase().slice(0, 2);
}

export function getUserInitials(fullName: string | null | undefined) {
  return (fullName || "U").split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2);
}

export function playNotificationSound() {
  try {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 0.4;
    audio.play().catch(() => {});
  } catch {
    // Silent fail
  }
}

export function showBrowserNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

export function isUserOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
  return diffMinutes < 5; // Consider online if seen in last 5 minutes
}

// utils.ts - Add the missing export
export function extractMentionedUserIds(content: string, candidates: { user_id: string; full_name: string | null }[]): string[] {
  const mentions: string[] = [];
  const mentionRegex = /@([^\s]+)/g;
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    const name = match[1].toLowerCase();
    const user = candidates.find(c => 
      (c.full_name || "").toLowerCase().includes(name) ||
      name.includes((c.full_name || "").toLowerCase().split(" ")[0].toLowerCase())
    );
    if (user) mentions.push(user.user_id);
  }
  
  return [...new Set(mentions)];
}
