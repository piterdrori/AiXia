import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getInstanceStatus,
  stopInstance,
  waitForInstanceStopped,
} from "./alibaba-ecs.ts";

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
      headers: {
        ...corsHeaders,
      },
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const instanceId = Deno.env.get("ALIYUN_INSTANCE_ID");

    if (!instanceId) {
      return new Response(
        JSON.stringify({ error: "Missing ALIYUN_INSTANCE_ID" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: state, error } = await supabase
      .from("translation_runtime_state")
      .select("singleton, ecs_status, warm_until")
      .eq("singleton", true)
      .single();

    if (error) {
      throw error;
    }

    if (!state) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No runtime state row found" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const warmUntil = state.warm_until
      ? new Date(state.warm_until).getTime()
      : 0;

    if (state.ecs_status !== "ON" || warmUntil > Date.now()) {
      return new Response(
        JSON.stringify({
          skipped: true,
          ecs_status: state.ecs_status,
          warm_until: state.warm_until,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const instanceStatus = await getInstanceStatus(instanceId);

    if (instanceStatus !== "Stopped") {
      await supabase
        .from("translation_runtime_state")
        .update({
          ecs_status: "STOPPING",
          updated_at: new Date().toISOString(),
        })
        .eq("singleton", true);

      await stopInstance(instanceId);
      await waitForInstanceStopped(instanceId, 120000);
    }

    await supabase
      .from("translation_runtime_state")
      .update({
        ecs_status: "OFF",
        updated_at: new Date().toISOString(),
      })
      .eq("singleton", true);

    return new Response(
      JSON.stringify({
        stopped: true,
        ecs_status: "OFF",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
