import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getInstanceStatus,
  startInstance,
  waitForInstanceRunning,
  sleep,
} from "../_shared/alibaba-ecs.ts";

declare const EdgeRuntime:
  | {
      waitUntil?: (promise: Promise<unknown>) => void;
    }
  | undefined;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function normalize(text: string) {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function getLibreTranslateUrl() {
  const url = Deno.env.get("LIBRETRANSLATE_URL");
  if (!url) {
    throw new Error("Missing LIBRETRANSLATE_URL");
  }
  return url;
}

function getLibreTranslateBaseUrl() {
  return getLibreTranslateUrl().replace(/\/translate\/?$/, "");
}

async function waitForLibreReady(timeoutMs = 120000) {
  const startedAt = Date.now();
  const healthUrl = `${getLibreTranslateBaseUrl()}/languages`;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(healthUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        return;
      }
    } catch {
      // keep polling
    }

    await sleep(3000);
  }

  throw new Error("LibreTranslate did not become ready before timeout.");
}

async function callTranslate(text: string, target: string) {
  const res = await fetch(getLibreTranslateUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: "auto",
      target,
      format: "text",
    }),
  });

  const data = await res.json();
  return data.translatedText;
}

function runInBackground(promise: Promise<unknown>) {
  try {
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(promise);
      return;
    }
  } catch {
    // ignore
  }

  void promise.catch((error) => {
    console.error("Background task error:", error);
  });
}

async function touchWarmWindow() {
  const now = new Date();
  const warmUntil = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  await supabase.from("translation_runtime_state").upsert(
    {
      singleton: true,
      last_translate_click_at: now.toISOString(),
      warm_until: warmUntil,
      updated_at: now.toISOString(),
    },
    {
      onConflict: "singleton",
    }
  );
}

async function ensureEcsWarmWindow() {
  const instanceId = Deno.env.get("ALIYUN_INSTANCE_ID");
  if (!instanceId) {
    throw new Error("Missing ALIYUN_INSTANCE_ID");
  }

  await touchWarmWindow();

  const instanceStatus = await getInstanceStatus(instanceId);

  if (instanceStatus === "Running") {
    await supabase
      .from("translation_runtime_state")
      .update({
        ecs_status: "ON",
        updated_at: new Date().toISOString(),
      })
      .eq("singleton", true);

    await waitForLibreReady(120000);
    return;
  }

  await supabase
    .from("translation_runtime_state")
    .update({
      ecs_status: "STARTING",
      updated_at: new Date().toISOString(),
    })
    .eq("singleton", true);

  if (instanceStatus !== "Starting" && instanceStatus !== "Pending") {
    await startInstance(instanceId);
  }

  await waitForInstanceRunning(instanceId, 120000);
  await waitForLibreReady(120000);

  await supabase
    .from("translation_runtime_state")
    .update({
      ecs_status: "ON",
      updated_at: new Date().toISOString(),
    })
    .eq("singleton", true);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messageId, text, targetLang } = await req.json();

    const normalized = normalize(text);

    const { data: msgCache } = await supabase
      .from("message_translations")
      .select("translated_text")
      .eq("message_id", messageId)
      .eq("language", targetLang)
      .maybeSingle();

    if (msgCache) {
      runInBackground(ensureEcsWarmWindow());

      return new Response(
        JSON.stringify({
          translatedText: msgCache.translated_text,
          source: "message_cache",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: memory } = await supabase
      .from("translation_memory")
      .select("id, translated_text, usage_count")
      .eq("source_text_normalized", normalized)
      .eq("language", targetLang)
      .maybeSingle();

    if (memory) {
      runInBackground(ensureEcsWarmWindow());

      await supabase.from("message_translations").upsert(
        {
          message_id: messageId,
          language: targetLang,
          translated_text: memory.translated_text,
        },
        {
          onConflict: "message_id,language",
        }
      );

      await supabase
        .from("translation_memory")
        .update({
          usage_count: (memory.usage_count || 0) + 1,
        })
        .eq("id", memory.id);

      return new Response(
        JSON.stringify({
          translatedText: memory.translated_text,
          source: "memory",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    await ensureEcsWarmWindow();

    const translated = await callTranslate(text, targetLang);

    await supabase.from("message_translations").upsert(
      {
        message_id: messageId,
        language: targetLang,
        translated_text: translated,
      },
      {
        onConflict: "message_id,language",
      }
    );

    const { data: existingTranslatedMemory } = await supabase
      .from("translation_memory")
      .select("id, usage_count")
      .eq("source_text_normalized", normalized)
      .eq("language", targetLang)
      .maybeSingle();

    if (existingTranslatedMemory) {
      await supabase
        .from("translation_memory")
        .update({
          translated_text: translated,
          usage_count: (existingTranslatedMemory.usage_count || 0) + 1,
        })
        .eq("id", existingTranslatedMemory.id);
    } else {
      await supabase.from("translation_memory").insert({
        source_text_normalized: normalized,
        language: targetLang,
        translated_text: translated,
        usage_count: 1,
      });
    }

    return new Response(
      JSON.stringify({
        translatedText: translated,
        source: "api",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
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
