import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  chunkText,
  clearInFlight,
  getInFlight,
  getMemoryCache,
  getSupportedLanguages,
  makeCacheKey,
  normalizeText,
  setInFlight,
  setMemoryCache,
  sleep,
  type TranslateResult,
  validateText,
} from "../_shared/translation-utils.ts";
import {
  getInstanceStatus,
  startInstance,
  waitForInstanceRunning,
} from "../_shared/alibaba-ecs.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestBody = {
  text: string;
  sourceLang: string;
  targetLang: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey);
}

async function pollLibreReady(baseUrl: string, timeoutMs = 60_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/languages`, { method: "GET" });
      if (res.ok) return;
    } catch {
      // ignore and keep polling
    }
    await sleep(4000);
  }

  throw new Error("LibreTranslate did not become ready before timeout.");
}

async function callLibreTranslate(
  baseUrl: string,
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  const chunks = chunkText(text, 900);
  const outputs: string[] = [];

  for (const chunk of chunks) {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(`${baseUrl}/translate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: chunk,
            source: sourceLang,
            target: targetLang,
            format: "text",
          }),
        });

        const textBody = await res.text();
        if (!res.ok) {
          throw new Error(`LibreTranslate ${res.status}: ${textBody}`);
        }

        const data = JSON.parse(textBody);
        outputs.push(String(data.translatedText ?? ""));
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 3) {
          await sleep(attempt * 1500);
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  return outputs.join(" ");
}

async function ensureEngineReady(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  libreBaseUrl: string,
): Promise<void> {
  const instanceId = Deno.env.get("ALIBABA_INSTANCE_ID");
  if (!instanceId) throw new Error("Missing ALIBABA_INSTANCE_ID.");

  const nowIso = new Date().toISOString();

  const { data: state, error: stateError } = await supabase
    .from("translation_engine_state")
    .select("*")
    .eq("singleton", true)
    .single();

  if (stateError) throw stateError;

  const warmUntil = state.warm_until ? new Date(state.warm_until).getTime() : 0;
  const startLockUntil = state.start_lock_until
    ? new Date(state.start_lock_until).getTime()
    : 0;

  if (state.status === "ON" && warmUntil > Date.now()) {
    return;
  }

  if (state.status === "STARTING" && startLockUntil > Date.now()) {
    await pollLibreReady(libreBaseUrl, 60_000);
    await supabase
      .from("translation_engine_state")
      .update({
        status: "ON",
        warm_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        last_seen_healthy_at: nowIso,
        updated_at: nowIso,
      })
      .eq("singleton", true);
    return;
  }

  await supabase
    .from("translation_engine_state")
    .update({
      status: "STARTING",
      start_lock_until: new Date(Date.now() + 90 * 1000).toISOString(),
      updated_at: nowIso,
      last_error: null,
    })
    .eq("singleton", true);

  try {
    const instanceStatus = await getInstanceStatus(instanceId);

    if (instanceStatus !== "Running") {
      await startInstance(instanceId);
      await waitForInstanceRunning(instanceId, 60_000);
    }

    await pollLibreReady(libreBaseUrl, 60_000);

    await supabase
      .from("translation_engine_state")
      .update({
        status: "ON",
        start_lock_until: null,
        warm_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        last_started_at: nowIso,
        last_seen_healthy_at: nowIso,
        updated_at: nowIso,
        last_error: null,
      })
      .eq("singleton", true);
  } catch (error) {
    await supabase
      .from("translation_engine_state")
      .update({
        status: "OFF",
        start_lock_until: null,
        updated_at: new Date().toISOString(),
        last_error: error instanceof Error ? error.message : String(error),
      })
      .eq("singleton", true);

    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as RequestBody;
    const text = body.text ?? "";
    const sourceLang = String(body.sourceLang ?? "").toLowerCase().trim();
    const targetLang = String(body.targetLang ?? "").toLowerCase().trim();

    validateText(text);

    if (!sourceLang || !targetLang) {
      return json({ error: "sourceLang and targetLang are required." }, 400);
    }

    if (sourceLang === targetLang) {
      return json({
        translatedText: text,
        quality: "fast",
        source: "memory",
      });
    }

    const key = await makeCacheKey(text, sourceLang, targetLang);

    const memoryHit = getMemoryCache(key);
    if (memoryHit) {
      return json(memoryHit);
    }

    const existingInFlight = getInFlight(key);
    if (existingInFlight) {
      const shared = await existingInFlight;
      return json(shared);
    }

    const run = (async (): Promise<TranslateResult> => {
      const supabase = getSupabaseAdmin();
      const libreBaseUrl = Deno.env.get("LIBRETRANSLATE_BASE_URL")!;

      const languages = await getSupportedLanguages(libreBaseUrl);
      if (!languages.has(sourceLang) || !languages.has(targetLang)) {
        throw new Error("Unsupported language code.");
      }

      const normalizedText = normalizeText(text);

      const { data: existing } = await supabase
        .from("translations")
        .select("translated_text, quality")
        .eq("hash", key)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("translations")
          .update({
            usage_count: 2,
            last_used_at: new Date().toISOString(),
          })
          .eq("hash", key);

        setMemoryCache(key, existing.translated_text, existing.quality);
        return {
          translatedText: existing.translated_text,
          quality: existing.quality,
          source: "db",
        };
      }

      try {
        await ensureEngineReady(supabase, libreBaseUrl);
      } catch {
        return {
          translatedText: "",
          quality: "fast",
          source: "ecs",
        };
      }

      const translatedText = await callLibreTranslate(
        libreBaseUrl,
        normalizedText,
        sourceLang,
        targetLang,
      );

      await supabase
        .from("translations")
        .upsert({
          hash: key,
          original_text: text,
          normalized_text: normalizedText,
          source_lang: sourceLang,
          target_lang: targetLang,
          translated_text: translatedText,
          quality: "fast",
          usage_count: 1,
          char_count: text.length,
          last_used_at: new Date().toISOString(),
        }, { onConflict: "hash" });

      await supabase
        .from("translation_engine_state")
        .update({
          status: "ON",
          warm_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          last_seen_healthy_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("singleton", true);

      setMemoryCache(key, translatedText, "fast");

      return {
        translatedText,
        quality: "fast",
        source: "ecs",
      };
    })();

    setInFlight(key, run);

    try {
      const result = await run;

      if (!result.translatedText) {
        return json({
          error: "Translation engine is starting, please try again shortly.",
          code: "ENGINE_STARTING",
        }, 503);
      }

      return json(result);
    } finally {
      clearInFlight(key);
    }
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
