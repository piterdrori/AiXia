import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async () => {
  try {
    const now = new Date().toISOString();

    // get pending reminders
    const { data: reminders, error } = await supabase
      .from("calendar_event_reminder_deliveries")
      .select(`
        id,
        calendar_event_id,
        reminder_at,
        reminder_minutes,
        calendar_events (
          id,
          title,
          created_by
        )
      `)
      .eq("delivery_status", "pending")
      .lte("reminder_at", now)
      .limit(50);

    if (error) throw error;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const reminder of reminders) {
      const event = reminder.calendar_events;
      if (!event) continue;

      // create notification
      const { data: notification, error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: event.created_by,
          actor_user_id: null,
          type: "REMINDER",
          title: `Reminder: ${event.title}`,
          message: "Event starting soon",
          link: `/calendar`,
          entity_type: "calendar_event",
          entity_id: event.id,
        })
        .select()
        .single();

      if (notifError) {
        await supabase
          .from("calendar_event_reminder_deliveries")
          .update({
            delivery_status: "failed",
            error_message: notifError.message,
          })
          .eq("id", reminder.id);

        continue;
      }

      // mark delivered
      await supabase
        .from("calendar_event_reminder_deliveries")
        .update({
          delivery_status: "delivered",
          delivered_at: new Date().toISOString(),
          notification_id: notification.id,
        })
        .eq("id", reminder.id);

      processed++;
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500 }
    );
  }
});
