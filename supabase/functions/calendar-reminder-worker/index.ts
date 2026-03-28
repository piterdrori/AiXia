import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ReminderEventRow = {
  id: string;
  title: string;
  created_by: string | null;
};

type ReminderDeliveryRow = {
  id: string;
  calendar_event_id: string;
  reminder_at: string;
  reminder_minutes: number;
  calendar_events: ReminderEventRow | ReminderEventRow[] | null;
};

type NotificationInsertRow = {
  id: string;
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async () => {
  try {
    const nowIso = new Date().toISOString();

    const { data: reminders, error } = await supabase
      .from("calendar_event_reminder_deliveries")
      .select(
        `
        id,
        calendar_event_id,
        reminder_at,
        reminder_minutes,
        calendar_events (
          id,
          title,
          created_by
        )
      `
      )
      .eq("delivery_status", "pending")
      .is("delivered_at", null)
      .lte("reminder_at", nowIso)
      .order("reminder_at", { ascending: true })
      .limit(50);

    if (error) throw error;

    const pendingReminders = (reminders || []) as ReminderDeliveryRow[];

    if (pendingReminders.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const reminder of pendingReminders) {
      const rawEvent = reminder.calendar_events;
      const event = Array.isArray(rawEvent) ? rawEvent[0] ?? null : rawEvent;

      const { data: claimedRows, error: claimError } = await supabase
        .from("calendar_event_reminder_deliveries")
        .update({
          delivery_status: "processing",
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reminder.id)
        .eq("delivery_status", "pending")
        .is("delivered_at", null)
        .select("id");

      if (claimError) {
        console.error("Failed to claim reminder:", reminder.id, claimError);
        continue;
      }

      if (!claimedRows || claimedRows.length === 0) {
        continue;
      }

      if (!event || !event.id || !event.created_by) {
        await supabase
          .from("calendar_event_reminder_deliveries")
          .update({
            delivery_status: "failed",
            error_message: "Missing related calendar event or created_by",
            updated_at: new Date().toISOString(),
          })
          .eq("id", reminder.id);

        continue;
      }

      const { data: notification, error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: event.created_by,
          actor_user_id: null,
          type: "REMINDER",
          title: `Reminder: ${event.title}`,
          message: "Event starting soon",
          link: `/calendar`,
          is_read: false,
          entity_type: "calendar_event",
          entity_id: event.id,
        })
        .select("id")
        .single();

      if (notifError || !notification) {
        await supabase
          .from("calendar_event_reminder_deliveries")
          .update({
            delivery_status: "failed",
            error_message: notifError?.message || "Failed to create notification",
            updated_at: new Date().toISOString(),
          })
          .eq("id", reminder.id);

        continue;
      }

      const typedNotification = notification as NotificationInsertRow;

      const { error: deliveredError } = await supabase
        .from("calendar_event_reminder_deliveries")
        .update({
          delivery_status: "delivered",
          delivered_at: new Date().toISOString(),
          notification_id: typedNotification.id,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reminder.id);

      if (deliveredError) {
        await supabase
          .from("calendar_event_reminder_deliveries")
          .update({
            delivery_status: "failed",
            error_message: deliveredError.message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", reminder.id);

        continue;
      }

      processed++;
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
