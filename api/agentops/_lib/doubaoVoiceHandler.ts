/**
 * AgentOps voice API — Doubao TTS status + synthesis (Phase B).
 * Secrets stay server-side. Owner-facing errors never include tokens or env names.
 */

import { randomUUID } from "node:crypto";

import { guardAgentOpsExecutionResponse } from "./agentopsStagingGuard.js";
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
  requestId: string;
};

function ownerSafeUpstreamError(status: number, code?: number | null): string {
  // OpenSpeech 3001 = lifetime / quota exhaustion — still owner-safe, no secret names.
  if (status === 429 || code === 3001) {
    return "Doubao voice is temporarily unavailable.";
  }
  if (status === 401 || status === 403) return "Doubao voice is temporarily unavailable.";
  if (status >= 500) return "Doubao voice is temporarily unavailable.";
  return "Doubao voice is temporarily unavailable.";
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
  // Hard-lock OpenSpeech URL — never accept attacker-controlled endpoints from request body.
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
  } catch (error) {
    if (params.signal.aborted) throw new Error("Doubao voice request aborted.");
    throw new Error("Doubao voice is temporarily unavailable.");
  }

  const mimeForFormat = (format: DoubaoTtsOutputFormat) => {
    if (format === "wav") return "audio/wav";
    if (format === "pcm") return "audio/pcm";
    return "audio/mpeg";
  };

  const contentType = response.headers.get("content-type") ?? "";
  // OpenSpeech commonly returns JSON (including error codes) even when HTTP status is non-2xx.
  if (contentType.includes("application/json") || !response.ok) {
    let json: {
      data?: string;
      code?: number;
      message?: string;
    };
    try {
      json = (await response.json()) as typeof json;
    } catch {
      console.error("[agentops-voice] upstream non-json", {
        httpStatus: response.status,
        contentType,
      });
      throw new Error(ownerSafeUpstreamError(response.status));
    }
    // Diagnostic only: numeric OpenSpeech code + short message — never tokens/headers.
    console.error("[agentops-voice] upstream", {
      httpStatus: response.status,
      contentType,
      code: typeof json.code === "number" ? json.code : null,
      message:
        typeof json.message === "string" ? json.message.slice(0, 120) : null,
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
  return { buffer, mimeType: mimeType.startsWith("audio/") ? mimeType : mimeForFormat(params.outputFormat) };
}

function buildStatus(env: NodeJS.ProcessEnv, requestId: string): AgentOpsVoiceStatusResponse {
  const config = getDoubaoTtsServerConfig(env);
  return {
    ok: true,
    provider: "doubao",
    configured: config.credentialsConfigured && config.voiceConfigured,
    active: config.canGenerateAudio,
    canGenerateAudio: config.canGenerateAudio,
    ownerApproved: config.ownerApproved,
    runtimeActive: config.runtimeActive,
    productionBlocked: config.productionBlocked && !config.productionAllowed,
    defaultVoiceId:
      config.providerMode === "local" ? config.local.voice : config.cloud.voiceId,
    outputFormat: config.cloud.outputFormat,
    language: config.cloud.language,
    blockingReason: config.canGenerateAudio
      ? null
      : mapDoubaoTtsOwnerError(config.blockingReason),
    requestId,
  };
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

  let body: {
    action?: string;
    text?: string;
    voiceId?: string;
    language?: string;
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
  if (action !== "tts") {
    return jsonResponse({ ok: false, error: "Unsupported action.", requestId }, 400);
  }

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

  // Static process.env.* reads (bundler-safe). Do not use dynamic env[name] for secrets.
  const accessToken =
    getDoubaoTtsAccessToken(env) ??
    process.env.DOUBAO_TTS_API_KEY?.trim() ??
    process.env.DOUBAO_TTS_ACCESS_TOKEN?.trim() ??
    "";
  const appId =
    config.cloud.appId?.trim() ||
    process.env.DOUBAO_TTS_APP_ID?.trim() ||
    "";
  const resolvedVoiceId =
    voiceId ||
    process.env.DOUBAO_TTS_VOICE_ID?.trim() ||
    "";
  if (!accessToken || !appId || !resolvedVoiceId) {
    return jsonResponse(
      {
        ok: false,
        error: "Doubao voice is not configured.",
        requestId,
      },
      503,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYNTH_TIMEOUT_MS);
  // Honor client abort if present.
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
