import { createClient } from "jsr:@supabase/supabase-js@2";

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
  try {
    const { messageId, text, targetLang } = await req.json();

    const normalized = normalize(text);

    // =========================
    // 1. CHECK MESSAGE CACHE
    // =========================
    const { data: msgCache } = await supabase
      .from("message_translations")
      .select("translated_text")
      .eq("message_id", messageId)
      .eq("language", targetLang)
      .maybeSingle();

    if (msgCache) {
      return new Response(
        JSON.stringify({ translatedText: msgCache.translated_text, source: "message_cache" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // =========================
    // 2. CHECK GLOBAL MEMORY
    // =========================
    const { data: memory } = await supabase
      .from("translation_memory")
      .select("translated_text")
      .eq("source_text_normalized", normalized)
      .eq("language", targetLang)
      .maybeSingle();

    if (memory) {
      // save to message cache
      await supabase.from("message_translations").insert({
        message_id: messageId,
        language: targetLang,
        translated_text: memory.translated_text,
      });

      return new Response(
        JSON.stringify({ translatedText: memory.translated_text, source: "memory" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // =========================
    // 3. CALL TRANSLATION API
    // =========================
    const translated = await callTranslate(text, targetLang);

    // save to both
    await supabase.from("message_translations").insert({
      message_id: messageId,
      language: targetLang,
      translated_text: translated,
    });

    await supabase.from("translation_memory").insert({
      source_text_normalized: normalized,
      language: targetLang,
      translated_text: translated,
    });

    return new Response(
      JSON.stringify({ translatedText: translated, source: "api" }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
});
