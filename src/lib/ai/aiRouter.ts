import { supabase } from "@/lib/supabase";

export type AskAIDebugCandidate = {
  id?: string;
  question?: string;
  similarity?: number;
  rank_score?: number;
  usage_count?: number;
  quality_score?: number;
};

export type AskAIDebug = {
  reason?: string;
  layer?: string;
  threshold?: number;
  totalCache?: number;
  avgUsage?: number;
  selected?: AskAIDebugCandidate;
  candidates?: AskAIDebugCandidate[];
};

export type AskAIResult = {
  success: boolean;
  text: string;
  provider?: string;
  model?: string;
  similarity?: number;
  matched_question?: string;
  debug?: AskAIDebug;
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
    similarity: data.similarity,
    matched_question: data.matched_question,
    debug: data.debug,
  };
}
