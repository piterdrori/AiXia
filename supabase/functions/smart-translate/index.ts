import { createClient } from "jsr:@supabase/supabase-js@2";

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

async function callTranslate(text: string, target: string) {
  const res = await fetch(Deno.env.get("LIBRETRANSLATE_URL")!, {
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
