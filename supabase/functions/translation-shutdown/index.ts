import { createClient } from "jsr:@supabase/supabase-js@2";
import { stopInstance } from "./alibaba-ecs.ts"; // file moved to same folder

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const instanceId = Deno.env.get("ALIBABA_INSTANCE_ID");

    if (!instanceId) {
      return new Response(
        JSON.stringify({ error: "Missing ALIBABA_INSTANCE_ID" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: state, error } = await supabase
      .from("translation_engine_state")
      .select("*")
      .eq("singleton", true)
      .single();

    if (error) throw error;

    const warmUntil = state.warm_until ? new Date(state.warm_until).getTime() : 0;

    // Skip if ECS is not ON or warm window is still active
    if (state.status !== "ON" || warmUntil > Date.now()) {
      return new Response(
        JSON.stringify({ skipped: true, ecs_status: state.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stop ECS
    await stopInstance(instanceId);

    // Update runtime state
    await supabase
      .from("translation_engine_state")
      .update({
        status: "OFF",
        updated_at: new Date().toISOString(),
      })
      .eq("singleton", true);

    return new Response(
      JSON.stringify({ stopped: true, ecs_status: "OFF" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
