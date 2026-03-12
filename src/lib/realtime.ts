import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const channelRegistry = new Map<string, RealtimeChannel>();

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
