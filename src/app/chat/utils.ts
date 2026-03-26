// utils.ts
import { format, isToday, isYesterday } from "date-fns";
import type {
  ChatGroupMemberRow,
  ChatGroupRow,
  ChatMessageRow,
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

// Sound notification helper
let audioContext: AudioContext | null = null;
export function playNotificationSound() {
  try {
    // Try modern AudioContext for better performance
    if (typeof window !== "undefined") {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Simple beep using oscillator as fallback if file fails
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }
    
    // Also try file-based sound
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 0.4;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  } catch {
    // Silent fail
  }
}

// Browser notification helper
export function showBrowserNotification(title: string, body: string, icon?: string) {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "granted") {
    new Notification(title, { 
      body,
      icon: icon || "/favicon.ico",
      badge: icon || "/favicon.ico",
      tag: "chat-message",
      requireInteraction: false
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}
