import { supabase } from "@/lib/supabase";

export type AskAIResult = {
  success: boolean;
  text: string;
  provider?: string;
  model?: string;
};

export async function askAI(prompt: string): Promise<AskAIResult> {
  const cleanPrompt = prompt.trim();

  if (!cleanPrompt) {
    throw new Error("Prompt is required");
  }

  const { data, error } = await supabase.functions.invoke("ai-router", {
    body: { prompt: cleanPrompt },
  });

  if (error) {
    throw new Error(error.message || "AI request failed");
  }

  if (!data?.success || typeof data?.text !== "string") {
    throw new Error(data?.error || "AI request failed");
  }

  return {
    success: true,
    text: data.text,
    provider: data.provider,
    model: data.model,
  };
}
