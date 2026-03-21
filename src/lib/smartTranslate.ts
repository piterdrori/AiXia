import { supabase } from "@/lib/supabase";

const LANGUAGE_STORAGE_KEY = "taskflow.language";

function getTargetLanguage(): string {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en";
}

export type SmartTranslateResult = {
  translatedText: string;
  source: "api" | "memory" | "message_cache";
};

export async function smartTranslate(params: {
  messageId: string;
  text: string;
}): Promise<SmartTranslateResult> {
  const targetLang = getTargetLanguage();

  const { data, error } = await supabase.functions.invoke("smart-translate", {
    body: {
      messageId: params.messageId,
      text: params.text,
      targetLang,
    },
  });

  if (error) {
    throw new Error(error.message || "Translation failed");
  }

  if (!data?.translatedText) {
    throw new Error("No translated text returned");
  }

  return {
    translatedText: data.translatedText,
    source: data.source,
  };
}
