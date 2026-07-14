/**
 * AgentOps STT client — POST audio to shared /api/agentops/voice action=stt.
 */

export type AgentOpsSttResult = {
  ok: boolean;
  provider?: "doubao";
  transcript?: string;
  language?: string;
  durationMs?: number | null;
  requestId?: string;
  error?: string;
};

const VOICE_API_PATH = "/api/agentops/voice";

export async function transcribeAgentOpsStt(input: {
  audio: Blob;
  mimeType: string;
  language?: string;
  durationMs?: number;
  signal?: AbortSignal;
}): Promise<AgentOpsSttResult> {
  const form = new FormData();
  form.append("action", "stt");
  form.append("mimeType", input.mimeType);
  if (input.language) form.append("language", input.language);
  if (typeof input.durationMs === "number") {
    form.append("durationMs", String(Math.trunc(input.durationMs)));
  }
  form.append("audio", input.audio, `stt.${input.mimeType.includes("ogg") ? "ogg" : "webm"}`);

  try {
    const response = await fetch(VOICE_API_PATH, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
      signal: input.signal,
    });
    const json = (await response.json()) as AgentOpsSttResult;
    if (!response.ok) {
      return {
        ok: false,
        error: json.error ?? "Speech recognition is temporarily unavailable.",
        requestId: json.requestId,
      };
    }
    return { ...json, ok: true };
  } catch (error) {
    if (input.signal?.aborted) {
      return { ok: false, error: "cancelled" };
    }
    return {
      ok: false,
      error:
        error instanceof Error && /Failed to fetch|NetworkError/i.test(error.message)
          ? "Speech recognition is temporarily unavailable."
          : "Speech recognition is temporarily unavailable.",
    };
  }
}
