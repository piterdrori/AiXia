import { createClient } from "jsr:@supabase/supabase-js@2";
import { stopInstance } from "../_shared/alibaba-ecs.ts";

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey);
}

Deno.serve(async () => {
  try {
    const supabase = getSupabaseAdmin();
    const instanceId = Deno.env.get("ALIBABA_INSTANCE_ID");

    if (!instanceId) {
      return new Response(JSON.stringify({ error: "Missing ALIBABA_INSTANCE_ID" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: state, error } = await supabase
      .from("translation_engine_state")
      .select("*")
      .eq("singleton", true)
      .single();

    if (error) throw error;

    const warmUntil = state.warm_until ? new Date(state.warm_until).getTime() : 0;
    if (state.status !== "ON" || warmUntil > Date.now()) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    await stopInstance(instanceId);

    await supabase
      .from("translation_engine_state")
      .update({
        status: "OFF",
        updated_at: new Date().toISOString(),
      })
      .eq("singleton", true);

    return new Response(JSON.stringify({ stopped: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});import { createClient } from "jsr:@supabase/supabase-js@2";
import { stopInstance } from "../_shared/alibaba-ecs.ts";

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey);
}

Deno.serve(async () => {
  try {
    const supabase = getSupabaseAdmin();
    const instanceId = Deno.env.get("ALIBABA_INSTANCE_ID");

    if (!instanceId) {
      return new Response(JSON.stringify({ error: "Missing ALIBABA_INSTANCE_ID" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: state, error } = await supabase
      .from("translation_engine_state")
      .select("*")
      .eq("singleton", true)
      .single();

    if (error) throw error;

    const warmUntil = state.warm_until ? new Date(state.warm_until).getTime() : 0;
    if (state.status !== "ON" || warmUntil > Date.now()) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    await stopInstance(instanceId);

    await supabase
      .from("translation_engine_state")
      .update({
        status: "OFF",
        updated_at: new Date().toISOString(),
      })
      .eq("singleton", true);

    return new Response(JSON.stringify({ stopped: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
