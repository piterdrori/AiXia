import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const channelRegistry = new Map<string, RealtimeChannel>();

/* =========================================================
   CORE CHANNEL MANAGEMENT
========================================================= */

export function registerRealtimeChannel(
  key: string,
  channel: RealtimeChannel
): RealtimeChannel {
  const existing = channelRegistry.get(key);

  if (existing) {
    void supabase.removeChannel(existing);
    channelRegistry.delete(key);
  }

  channelRegistry.set(key, channel);
  return channel;
}

export async function removeRealtimeChannel(key: string): Promise<void> {
  const existing = channelRegistry.get(key);
  if (!existing) return;

  await supabase.removeChannel(existing);
  channelRegistry.delete(key);
}

export async function removeAllRealtimeChannels(): Promise<void> {
  const entries = Array.from(channelRegistry.entries());

  for (const [key, channel] of entries) {
    await supabase.removeChannel(channel);
    channelRegistry.delete(key);
  }
}

export function getRegisteredRealtimeChannelKeys(): string[] {
  return Array.from(channelRegistry.keys());
}

/* =========================================================
   NEW: MESSAGE REALTIME SUBSCRIPTION (CRITICAL)
========================================================= */

export function subscribeToMessages({
  groupId,
  onInsert,
}: {
  groupId: string;
  onInsert: (payload: any) => void;
}) {
  const channelKey = `chat:messages:${groupId}`;

  const channel = supabase
    .channel(channelKey)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        onInsert(payload.new);
      }
    )
    .subscribe();

  return registerRealtimeChannel(channelKey, channel);
}
