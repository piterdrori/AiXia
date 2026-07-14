/**
 * AgentOps voice API — Doubao TTS + flash STT (Phases B/C).
 * Secrets stay server-side. Owner-facing errors never include tokens or env names.
 */

import { randomUUID } from "node:crypto";

import { guardAgentOpsExecutionResponse } from "./agentopsStagingGuard.js";
import {
  DOUBAO_STT_ALLOWED_FORMATS,
  DOUBAO_STT_MAX_AUDIO_BYTES,
  DOUBAO_STT_MAX_DURATION_MS,
  DOUBAO_STT_MAX_TRANSCRIPT_CHARS,
  getDoubaoSttAccessToken,
  getDoubaoSttServerConfig,
  isDoubaoSttRuntimeActive,
  mapDoubaoSttOwnerError,
  mimeToDoubaoSttFormat,
} from "./doubaoSttConfig.js";
import {
  DOUBAO_TTS_CHUNK_MAX_CHARS,
  getDoubaoTtsAccessToken,
  getDoubaoTtsServerConfig,
  isDoubaoTtsRuntimeActive,
  mapDoubaoTtsOwnerError,
  type DoubaoTtsOutputFormat,
} from "./doubaoTtsConfig.js";
import { jsonResponse, readOptionalInternalSecret } from "./ollamaProxy.js";

const SYNTH_TIMEOUT_MS = 25_000;
const STT_TIMEOUT_MS = 30_000;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

export type AgentOpsVoiceStatusResponse = {
  ok: true;
  provider: "doubao";
  configured: boolean;
  active: boolean;
  canGenerateAudio: boolean;
  ownerApproved: boolean;
  runtimeActive: boolean;
  productionBlocked: boolean;
  defaultVoiceId: string | null;
  outputFormat: string;
  language: string;
  blockingReason: string | null;
  ttsConfigured: boolean;
  ttsActive: boolean;
  sttConfigured: boolean;
  sttActive: boolean;
  sttProvider: "doubao" | "none";
  canTranscribe: boolean;
  sttLanguage: string;
  sttBlockingReason: string | null;
  requestId: string;
};

function ownerSafeUpstreamError(status: number, code?: number | null): string {
  if (status === 429 || code === 3001) {
    return "Doubao voice is temporarily unavailable.";
  }
  if (status === 401 || status === 403) return "Doubao voice is temporarily unavailable.";
  if (status >= 500) return "Doubao voice is temporarily unavailable.";
  return "Doubao voice is temporarily unavailable.";
}

function ownerSafeSttUpstreamError(status: number): string {
  if (status === 401 || status === 403) {
    return "Speech recognition is temporarily unavailable.";
  }
  if (status === 429) return "Speech recognition is temporarily unavailable.";
  if (status >= 500) return "Speech recognition is temporarily unavailable.";
  return "Speech recognition is temporarily unavailable.";
}

async function synthesizeCloud(params: {
  text: string;
  voiceId: string;
  outputFormat: DoubaoTtsOutputFormat;
  accessToken: string;
  appId: string;
  cluster: string;
  apiUrl: string;
  signal: AbortSignal;
}): Promise<{ buffer: Buffer; mimeType: string }> {
  if (
    !params.apiUrl.startsWith("https://") ||
    !params.apiUrl.includes("openspeech.bytedance.com") ||
    !params.apiUrl.endsWith("/api/v1/tts")
  ) {
    throw new Error("Doubao voice is not configured.");
  }

  const encoding =
    params.outputFormat === "wav" ? "wav" : params.outputFormat === "pcm" ? "pcm" : "mp3";

  let response: Response;
  try {
    response = await fetch(params.apiUrl, {
      method: "POST",
      signal: params.signal,
      headers: {
        Authorization: `Bearer;${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app: {
          appid: params.appId,
          token: "access_token",
          cluster: params.cluster,
        },
        user: { uid: "agentops-tts" },
        audio: {
          voice_type: params.voiceId,
          encoding,
          speed_ratio: 1.0,
        },
        request: {
          reqid: randomUUID(),
          text: params.text,
          text_type: "plain",
          operation: "query",
        },
      }),
    });
  } catch {
    if (params.signal.aborted) throw new Error("Doubao voice request aborted.");
    throw new Error("Doubao voice is temporarily unavailable.");
  }

  const mimeForFormat = (format: DoubaoTtsOutputFormat) => {
    if (format === "wav") return "audio/wav";
    if (format === "pcm") return "audio/pcm";
    return "audio/mpeg";
  };

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json") || !response.ok) {
    let json: { data?: string; code?: number; message?: string };
    try {
      json = (await response.json()) as typeof json;
    } catch {
      console.error("[agentops-voice] upstream non-json", {
        httpStatus: response.status,
        contentType,
      });
      throw new Error(ownerSafeUpstreamError(response.status));
    }
    console.error("[agentops-voice] upstream", {
      httpStatus: response.status,
      contentType,
      code: typeof json.code === "number" ? json.code : null,
      message: typeof json.message === "string" ? json.message.slice(0, 120) : null,
    });
    if (!response.ok) {
      throw new Error(
        ownerSafeUpstreamError(
          response.status,
          typeof json.code === "number" ? json.code : null,
        ),
      );
    }
    if (json.code && json.code !== 0 && json.code !== 3000) {
      throw new Error(
        ownerSafeUpstreamError(
          response.status || 502,
          typeof json.code === "number" ? json.code : null,
        ),
      );
    }
    if (!json.data || typeof json.data !== "string") {
      throw new Error("Doubao voice is temporarily unavailable.");
    }
    const buffer = Buffer.from(json.data, "base64");
    if (!buffer.length || buffer.length > MAX_AUDIO_BYTES) {
      throw new Error("Doubao voice is temporarily unavailable.");
    }
    return { buffer, mimeType: mimeForFormat(params.outputFormat) };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > MAX_AUDIO_BYTES) {
    throw new Error("Doubao voice is temporarily unavailable.");
  }
  const mimeType = contentType || mimeForFormat(params.outputFormat);
  if (!/^audio\//i.test(mimeType) && !contentType.includes("octet-stream")) {
    throw new Error("Doubao voice is temporarily unavailable.");
  }
  return {
    buffer,
    mimeType: mimeType.startsWith("audio/") ? mimeType : mimeForFormat(params.outputFormat),
  };
}

function extractTranscript(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.text === "string" && record.text.trim()) return record.text.trim();
  if (typeof record.transcript === "string" && record.transcript.trim()) {
    return record.transcript.trim();
  }
  if (typeof record.result === "string" && record.result.trim()) return record.result.trim();
  if (record.result && typeof record.result === "object") {
    const result = record.result as Record<string, unknown>;
    if (typeof result.text === "string" && result.text.trim()) return result.text.trim();
    if (Array.isArray(result.utterances)) {
      const joined = result.utterances
        .map((u) =>
          u && typeof u === "object" && typeof (u as { text?: unknown }).text === "string"
            ? String((u as { text: string }).text).trim()
            : "",
        )
        .filter(Boolean)
        .join(" ")
        .trim();
      if (joined) return joined;
    }
  }
  if (record.data && typeof record.data === "object") {
    return extractTranscript(record.data);
  }
  return null;
}

async function transcribeFlash(params: {
  audioBase64: string;
  format: string;
  language: string;
  appId: string;
  accessToken: string;
  resourceId: string;
  apiUrl: string;
  signal: AbortSignal;
}): Promise<{ transcript: string }> {
  if (
    !params.apiUrl.startsWith("https://") ||
    !params.apiUrl.includes("openspeech.bytedance.com") ||
    !params.apiUrl.includes("/auc/") ||
    !params.apiUrl.includes("recognize")
  ) {
    throw new Error("Doubao speech recognition is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(params.apiUrl, {
      method: "POST",
      signal: params.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Api-App-Key": params.appId,
        "X-Api-Access-Key": params.accessToken,
        "X-Api-Resource-Id": params.resourceId,
        "X-Api-Request-Id": randomUUID(),
        "X-Api-Sequence": "-1",
      },
      body: JSON.stringify({
        user: { uid: params.appId },
        audio: { data: params.audioBase64, format: params.format },
        request: {
          model_name: "bigmodel",
          language: params.language,
        },
      }),
    });
  } catch {
    if (params.signal.aborted) throw new Error("cancelled");
    throw new Error("Speech recognition is temporarily unavailable.");
  }

  const responseText = await response.text();
  let parsed: unknown = null;
  try {
    parsed = responseText ? JSON.parse(responseText) : null;
  } catch {
    parsed = null;
  }

  const apiStatus =
    response.headers.get("X-Api-Status-Code") ?? response.headers.get("x-api-status-code");
  console.error("[agentops-voice-stt] upstream", {
    httpStatus: response.status,
    apiStatus,
    message: (
      response.headers.get("X-Api-Message") ??
      response.headers.get("x-api-message") ??
      ""
    ).slice(0, 80),
  });

  if (!response.ok) {
    throw new Error(ownerSafeSttUpstreamError(response.status));
  }

  const transcript = extractTranscript(parsed);
  if (!transcript) {
    throw new Error("No speech detected.");
  }
  return {
    transcript: transcript.slice(0, DOUBAO_STT_MAX_TRANSCRIPT_CHARS),
  };
}

function buildStatus(env: NodeJS.ProcessEnv, requestId: string): AgentOpsVoiceStatusResponse {
  const tts = getDoubaoTtsServerConfig(env);
  const stt = getDoubaoSttServerConfig(env);
  return {
    ok: true,
    provider: "doubao",
    configured: tts.credentialsConfigured && tts.voiceConfigured,
    active: tts.canGenerateAudio,
    canGenerateAudio: tts.canGenerateAudio,
    ownerApproved: tts.ownerApproved,
    runtimeActive: tts.runtimeActive,
    productionBlocked: tts.productionBlocked && !tts.productionAllowed,
    defaultVoiceId: tts.providerMode === "local" ? tts.local.voice : tts.cloud.voiceId,
    outputFormat: tts.cloud.outputFormat,
    language: tts.cloud.language,
    blockingReason: tts.canGenerateAudio ? null : mapDoubaoTtsOwnerError(tts.blockingReason),
    ttsConfigured: tts.credentialsConfigured && tts.voiceConfigured,
    ttsActive: tts.canGenerateAudio,
    sttConfigured: stt.credentialsConfigured && stt.httpEndpointConfigured,
    sttActive: stt.canTranscribe,
    sttProvider: stt.canTranscribe ? "doubao" : "none",
    canTranscribe: stt.canTranscribe,
    sttLanguage: stt.language,
    sttBlockingReason: stt.canTranscribe ? null : mapDoubaoSttOwnerError(stt.blockingReason),
    requestId,
  };
}

async function handleTtsPost(
  request: Request,
  env: NodeJS.ProcessEnv,
  requestId: string,
  body: { text?: string; voiceId?: string; language?: string },
): Promise<Response> {
  const config = getDoubaoTtsServerConfig(env);
  if (!isDoubaoTtsRuntimeActive(env) || !config.canGenerateAudio) {
    return jsonResponse(
      {
        ok: false,
        error: mapDoubaoTtsOwnerError(config.blockingReason),
        requestId,
      },
      503,
    );
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return jsonResponse({ ok: false, error: "Text is required.", requestId }, 400);
  }
  if (text.length > DOUBAO_TTS_CHUNK_MAX_CHARS) {
    return jsonResponse(
      {
        ok: false,
        error: `Text must be at most ${DOUBAO_TTS_CHUNK_MAX_CHARS} characters per request.`,
        requestId,
      },
      400,
    );
  }

  const voiceId =
    (typeof body.voiceId === "string" && body.voiceId.trim()
      ? body.voiceId.trim()
      : config.cloud.voiceId) ?? "";
  const accessToken =
    getDoubaoTtsAccessToken(env) ??
    process.env.DOUBAO_TTS_API_KEY?.trim() ??
    process.env.DOUBAO_TTS_ACCESS_TOKEN?.trim() ??
    "";
  const appId = config.cloud.appId?.trim() || process.env.DOUBAO_TTS_APP_ID?.trim() || "";
  const resolvedVoiceId = voiceId || process.env.DOUBAO_TTS_VOICE_ID?.trim() || "";
  if (!accessToken || !appId || !resolvedVoiceId) {
    return jsonResponse(
      { ok: false, error: "Doubao voice is not configured.", requestId },
      503,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYNTH_TIMEOUT_MS);
  if (request.signal) {
    if (request.signal.aborted) controller.abort();
    else request.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const result = await synthesizeCloud({
      text,
      voiceId: resolvedVoiceId,
      outputFormat: config.cloud.outputFormat,
      accessToken,
      appId,
      cluster: config.cloud.cluster || process.env.DOUBAO_TTS_CLUSTER?.trim() || "volcano_tts",
      apiUrl: config.cloud.apiUrl,
      signal: controller.signal,
    });

    return new Response(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "X-AgentOps-Voice-Provider": "doubao",
        "X-AgentOps-Request-Id": requestId,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Doubao voice is temporarily unavailable.";
    const aborted = controller.signal.aborted;
    return jsonResponse(
      {
        ok: false,
        error: aborted
          ? "Doubao voice is temporarily unavailable."
          : /Doubao voice/.test(message)
            ? message
            : "Doubao voice is temporarily unavailable.",
        requestId,
      },
      aborted ? 504 : 502,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function handleSttPost(
  request: Request,
  env: NodeJS.ProcessEnv,
  requestId: string,
  input: {
    audioBytes: Buffer;
    mimeType: string;
    language?: string;
    durationMs?: number;
  },
): Promise<Response> {
  const config = getDoubaoSttServerConfig(env);
  if (!isDoubaoSttRuntimeActive(env) || !config.canTranscribe) {
    return jsonResponse(
      {
        ok: false,
        error: mapDoubaoSttOwnerError(config.blockingReason),
        requestId,
      },
      503,
    );
  }

  if (!input.audioBytes.length) {
    return jsonResponse({ ok: false, error: "No speech detected.", requestId }, 400);
  }
  if (input.audioBytes.length > DOUBAO_STT_MAX_AUDIO_BYTES) {
    return jsonResponse(
      { ok: false, error: "Recording is too large. Try a shorter clip.", requestId },
      400,
    );
  }
  if (
    typeof input.durationMs === "number" &&
    input.durationMs > DOUBAO_STT_MAX_DURATION_MS + 2_000
  ) {
    return jsonResponse(
      { ok: false, error: "Recording is too long. Keep it under 45 seconds.", requestId },
      400,
    );
  }

  const format = mimeToDoubaoSttFormat(input.mimeType);
  if (!format || !DOUBAO_STT_ALLOWED_FORMATS.has(format)) {
    return jsonResponse(
      {
        ok: false,
        error: "Unsupported audio format. Try Chrome or Edge.",
        requestId,
      },
      400,
    );
  }

  const accessToken =
    getDoubaoSttAccessToken(env) ??
    process.env.DOUBAO_STT_ACCESS_TOKEN?.trim() ??
    process.env.DOUBAO_TTS_API_KEY?.trim() ??
    "";
  const appId =
    config.appId?.trim() ||
    process.env.DOUBAO_STT_APP_ID?.trim() ||
    process.env.DOUBAO_TTS_APP_ID?.trim() ||
    "";
  const resourceId =
    config.resourceId?.trim() ||
    process.env.DOUBAO_STT_RESOURCE_ID?.trim() ||
    "volc.bigasr.auc_turbo";

  if (!accessToken || !appId || !resourceId) {
    return jsonResponse(
      {
        ok: false,
        error: "Doubao speech recognition is not configured.",
        requestId,
      },
      503,
    );
  }

  const language =
    (typeof input.language === "string" && input.language.trim()
      ? input.language.trim()
      : config.language) || "en-US";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STT_TIMEOUT_MS);
  if (request.signal) {
    if (request.signal.aborted) controller.abort();
    else request.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const result = await transcribeFlash({
      audioBase64: input.audioBytes.toString("base64"),
      format,
      language,
      appId,
      accessToken,
      resourceId,
      apiUrl: config.httpApiUrl,
      signal: controller.signal,
    });

    return jsonResponse({
      ok: true,
      provider: "doubao",
      transcript: result.transcript,
      language,
      durationMs: input.durationMs ?? null,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Speech recognition is temporarily unavailable.";
    const aborted = controller.signal.aborted;
    const noSpeech = /No speech detected/i.test(message);
    return jsonResponse(
      {
        ok: false,
        error: aborted
          ? "Speech recognition is temporarily unavailable."
          : noSpeech
            ? "No speech detected."
            : /Speech recognition|Doubao speech|No speech|Recording|Unsupported/i.test(message)
              ? message
              : "Speech recognition is temporarily unavailable.",
        requestId,
      },
      aborted ? 504 : noSpeech ? 422 : 502,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleAgentOpsVoiceRequest(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Response> {
  const requestId = randomUUID();

  if (request.method === "GET") {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") ?? "status";
    if (action !== "status") {
      return jsonResponse({ ok: false, error: "Unsupported action.", requestId }, 400);
    }
    return jsonResponse(buildStatus(env, requestId));
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed", requestId }, 405);
  }

  const stagingBlocked = guardAgentOpsExecutionResponse();
  if (stagingBlocked) return stagingBlocked;

  if (!readOptionalInternalSecret(request)) {
    return jsonResponse({ ok: false, error: "Unauthorized", requestId }, 401);
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonResponse({ ok: false, error: "Invalid form body.", requestId }, 400);
    }
    const action = String(form.get("action") ?? "stt").trim();
    if (action === "status") {
      return jsonResponse(buildStatus(env, requestId));
    }
    if (action !== "stt") {
      return jsonResponse({ ok: false, error: "Unsupported action.", requestId }, 400);
    }

    const audioField = form.get("audio");
    if (!(audioField instanceof Blob) || audioField.size <= 0) {
      return jsonResponse({ ok: false, error: "No speech detected.", requestId }, 400);
    }
    const mimeType =
      (typeof form.get("mimeType") === "string" && String(form.get("mimeType")).trim()) ||
      audioField.type ||
      "audio/webm";
    const language =
      typeof form.get("language") === "string" ? String(form.get("language")).trim() : undefined;
    const durationRaw = form.get("durationMs");
    const durationMs =
      typeof durationRaw === "string" && Number.isFinite(Number(durationRaw))
        ? Math.trunc(Number(durationRaw))
        : undefined;

    const audioBytes = Buffer.from(await audioField.arrayBuffer());
    return handleSttPost(request, env, requestId, {
      audioBytes,
      mimeType,
      language,
      durationMs,
    });
  }

  let body: {
    action?: string;
    text?: string;
    voiceId?: string;
    language?: string;
    audioBase64?: string;
    mimeType?: string;
    durationMs?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body.", requestId }, 400);
  }

  const action = typeof body.action === "string" ? body.action.trim() : "tts";
  if (action === "status") {
    return jsonResponse(buildStatus(env, requestId));
  }
  if (action === "stt") {
    const audioBase64 = typeof body.audioBase64 === "string" ? body.audioBase64.trim() : "";
    if (!audioBase64) {
      return jsonResponse({ ok: false, error: "No speech detected.", requestId }, 400);
    }
    let audioBytes: Buffer;
    try {
      audioBytes = Buffer.from(audioBase64, "base64");
    } catch {
      return jsonResponse({ ok: false, error: "Invalid audio payload.", requestId }, 400);
    }
    return handleSttPost(request, env, requestId, {
      audioBytes,
      mimeType: typeof body.mimeType === "string" ? body.mimeType : "audio/webm",
      language: typeof body.language === "string" ? body.language : undefined,
      durationMs: typeof body.durationMs === "number" ? body.durationMs : undefined,
    });
  }
  if (action !== "tts") {
    return jsonResponse({ ok: false, error: "Unsupported action.", requestId }, 400);
  }

  return handleTtsPost(request, env, requestId, body);
}
