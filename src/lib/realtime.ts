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

/* =========================================================
   TASK REALTIME SUBSCRIPTIONS
========================================================= */

export function subscribeToTask({
  taskId,
  onUpdate,
}: {
  taskId: string;
  onUpdate: (payload: any) => void;
}) {
  const channelKey = `task:${taskId}`;

  const channel = supabase
    .channel(channelKey)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "tasks",
        filter: `id=eq.${taskId}`,
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .subscribe();

  return registerRealtimeChannel(channelKey, channel);
}

export function subscribeToTaskComments({
  taskId,
  onInsert,
}: {
  taskId: string;
  onInsert: (payload: any) => void;
}) {
  const channelKey = `task:comments:${taskId}`;

  const channel = supabase
    .channel(channelKey)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "task_comments",
        filter: `task_id=eq.${taskId}`,
      },
      (payload) => {
        onInsert(payload.new);
      }
    )
    .subscribe();

  return registerRealtimeChannel(channelKey, channel);
}

export function subscribeToTaskActivity({
  taskId,
  onInsert,
}: {
  taskId: string;
  onInsert: (payload: any) => void;
}) {
  const channelKey = `task:activity:${taskId}`;

  const channel = supabase
    .channel(channelKey)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "activity_logs",
        filter: `task_id=eq.${taskId}`,
      },
      (payload) => {
        onInsert(payload.new);
      }
    )
    .subscribe();

  return registerRealtimeChannel(channelKey, channel);
}

/* =========================================================
   DASHBOARD REALTIME SUBSCRIPTIONS
========================================================= */

export function subscribeToDashboardActivity({
  userId,
  onInsert,
  onDelete,
}: {
  userId: string;
  onInsert: (payload: any) => void;
  onDelete: (payload: any) => void;
}) {
  const channelKey = `dashboard:activity:${userId}`;

  const channel = supabase
    .channel(channelKey)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "activity_logs",
      },
      (payload) => {
        onInsert(payload.new);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "activity_logs",
      },
      (payload) => {
        onDelete(payload.old);
      }
    )
    .subscribe();

  return registerRealtimeChannel(channelKey, channel);
}

export function subscribeToDashboardTasks({
  userId,
  onInsert,
  onUpdate,
  onDelete,
}: {
  userId: string;
  onInsert: (payload: any) => void;
  onUpdate: (payload: any) => void;
  onDelete: (payload: any) => void;
}) {
  const channelKey = `dashboard:tasks:${userId}`;

  const channel = supabase
    .channel(channelKey)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "tasks",
      },
      (payload) => {
        onInsert(payload.new);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "tasks",
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "tasks",
      },
      (payload) => {
        onDelete(payload.old);
      }
    )
    .subscribe();

  return registerRealtimeChannel(channelKey, channel);
}

export function subscribeToDashboardProjects({
  userId,
  onInsert,
  onUpdate,
  onDelete,
}: {
  userId: string;
  onInsert: (payload: any) => void;
  onUpdate: (payload: any) => void;
  onDelete: (payload: any) => void;
}) {
  const channelKey = `dashboard:projects:${userId}`;

  const channel = supabase
    .channel(channelKey)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "projects",
      },
      (payload) => {
        onInsert(payload.new);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "projects",
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "projects",
      },
      (payload) => {
        onDelete(payload.old);
      }
    )
    .subscribe();

  return registerRealtimeChannel(channelKey, channel);
}
