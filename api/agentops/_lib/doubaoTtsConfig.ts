/**
 * Server-side Doubao / Volcengine OpenSpeech TTS configuration — env only, no provider calls.
 * Recovered (minimal) from untracked WIP for Phase B. Secrets never leave the server.
 */

import { isAgentOpsProductionBlocked } from "./ollamaProxy.js";

export const DOUBAO_TTS_DEFAULT_API_URL = "https://openspeech.bytedance.com/api/v1/tts";
export const DOUBAO_TTS_CHUNK_MAX_CHARS = 300;
export const DOUBAO_TTS_MAX_AUTO_SPEAK_CHARS = 900;

export type DoubaoTtsProviderMode = "cloud" | "local" | "none";
export type DoubaoTtsOutputFormat = "mp3" | "wav" | "pcm";

export type DoubaoTtsServerConfig = {
  providerMode: DoubaoTtsProviderMode;
  apiContractConfigured: boolean;
  credentialsConfigured: boolean;
  voiceConfigured: boolean;
  ownerApproved: boolean;
  runtimeActive: boolean;
  productionBlocked: boolean;
  productionAllowed: boolean;
  canGenerateAudio: boolean;
  blockingReason: string | null;
  cloud: {
    apiUrl: string;
    appId: string | null;
    cluster: string;
    voiceId: string | null;
    language: string;
    outputFormat: DoubaoTtsOutputFormat;
    accessTokenPresent: boolean;
  };
  local: {
    baseUrl: string | null;
    voice: string;
  };
};

/**
 * Static process.env.* reads keep Vercel/serverless bundlers from dropping vars.
 * Prefer reading from the provided env object when present (tests).
 */
function readEnv(name: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const fromArg = env[name];
  if (typeof fromArg === "string" && fromArg.trim()) return fromArg.trim();

  // Explicit names — do not invent duplicates.
  const staticMap: Record<string, string | undefined> = {
    DOUBAO_TTS_APP_ID: process.env.DOUBAO_TTS_APP_ID,
    DOUBAO_TTS_API_KEY: process.env.DOUBAO_TTS_API_KEY,
    DOUBAO_TTS_ACCESS_TOKEN: process.env.DOUBAO_TTS_ACCESS_TOKEN,
    DOUBAO_TTS_API_URL: process.env.DOUBAO_TTS_API_URL,
    DOUBAO_TTS_API_BASE_URL: process.env.DOUBAO_TTS_API_BASE_URL,
    DOUBAO_TTS_API_PATH: process.env.DOUBAO_TTS_API_PATH,
    DOUBAO_TTS_VOICE_ID: process.env.DOUBAO_TTS_VOICE_ID,
    DOUBAO_TTS_CLUSTER: process.env.DOUBAO_TTS_CLUSTER,
    DOUBAO_TTS_LANGUAGE: process.env.DOUBAO_TTS_LANGUAGE,
    DOUBAO_TTS_OUTPUT_FORMAT: process.env.DOUBAO_TTS_OUTPUT_FORMAT,
    DOUBAO_TTS_LOCAL_BASE_URL: process.env.DOUBAO_TTS_LOCAL_BASE_URL,
    DOUBAO_TTS_LOCAL_VOICE: process.env.DOUBAO_TTS_LOCAL_VOICE,
    AGENTOPS_DOUBAO_TTS_ACTIVE: process.env.AGENTOPS_DOUBAO_TTS_ACTIVE,
    AGENTOPS_DOUBAO_TTS_OWNER_APPROVED: process.env.AGENTOPS_DOUBAO_TTS_OWNER_APPROVED,
    AGENTOPS_DOUBAO_TTS_PRODUCTION_ALLOWED: process.env.AGENTOPS_DOUBAO_TTS_PRODUCTION_ALLOWED,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  const value = staticMap[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function resolveCloudApiUrl(env: NodeJS.ProcessEnv): string {
  const explicitUrl = readEnv("DOUBAO_TTS_API_URL", env);
  if (explicitUrl) return explicitUrl.replace(/\/+$/, "");

  const legacyBase = readEnv("DOUBAO_TTS_API_BASE_URL", env)?.replace(/\/+$/, "");
  const legacyPath = readEnv("DOUBAO_TTS_API_PATH", env);
  if (legacyBase && legacyPath) {
    return `${legacyBase}${legacyPath.startsWith("/") ? legacyPath : `/${legacyPath}`}`;
  }
  if (legacyBase) return legacyBase;

  return DOUBAO_TTS_DEFAULT_API_URL;
}

function resolveAccessToken(env: NodeJS.ProcessEnv): string | undefined {
  return readEnv("DOUBAO_TTS_API_KEY", env) ?? readEnv("DOUBAO_TTS_ACCESS_TOKEN", env);
}

function resolveOutputFormat(env: NodeJS.ProcessEnv): DoubaoTtsOutputFormat {
  const raw = readEnv("DOUBAO_TTS_OUTPUT_FORMAT", env)?.toLowerCase();
  if (raw === "wav" || raw === "pcm") return raw;
  return "mp3";
}

export function isDoubaoTtsOwnerApproved(env: NodeJS.ProcessEnv = process.env): boolean {
  const dedicated = readEnv("AGENTOPS_DOUBAO_TTS_OWNER_APPROVED", env);
  if (dedicated === "false") return false;
  if (dedicated === "true") return true;
  return false;
}

export function isDoubaoTtsRuntimeActive(env: NodeJS.ProcessEnv = process.env): boolean {
  const active = readEnv("AGENTOPS_DOUBAO_TTS_ACTIVE", env);
  if (active === "false") return false;
  if (active === "true") return true;
  return false;
}

export function isDoubaoTtsProductionAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return readEnv("AGENTOPS_DOUBAO_TTS_PRODUCTION_ALLOWED", env) === "true";
}

export function getDoubaoTtsServerConfig(env: NodeJS.ProcessEnv = process.env): DoubaoTtsServerConfig {
  const localBase = readEnv("DOUBAO_TTS_LOCAL_BASE_URL", env)?.replace(/\/+$/, "") ?? null;
  const localVoice = readEnv("DOUBAO_TTS_LOCAL_VOICE", env) ?? "M1";
  const accessToken = resolveAccessToken(env);
  const appId = readEnv("DOUBAO_TTS_APP_ID", env) ?? null;
  const voiceId = readEnv("DOUBAO_TTS_VOICE_ID", env) ?? null;
  const apiUrl = resolveCloudApiUrl(env);
  const cluster = readEnv("DOUBAO_TTS_CLUSTER", env) ?? "volcano_tts";

  const providerMode: DoubaoTtsProviderMode = localBase ? "local" : accessToken ? "cloud" : "none";
  const voiceConfigured =
    providerMode === "local" ? Boolean(localBase) : Boolean(voiceId && voiceId.trim());
  const credentialsConfigured =
    providerMode === "local" ? Boolean(localBase) : Boolean(accessToken && appId);
  const apiContractConfigured =
    apiUrl.startsWith("https://") &&
    apiUrl.includes("openspeech.bytedance.com") &&
    apiUrl.endsWith("/api/v1/tts");
  const ownerApproved = isDoubaoTtsOwnerApproved(env);
  const runtimeActive = isDoubaoTtsRuntimeActive(env);
  // Prefer explicit env arg (tests) over process singleton for production gate.
  const productionBlocked =
    readEnv("VERCEL_ENV", env) === "production" || isAgentOpsProductionBlocked();
  const productionAllowed = isDoubaoTtsProductionAllowed(env);
  const productionGateOk = !productionBlocked || productionAllowed;

  let blockingReason: string | null = null;
  if (!credentialsConfigured) {
    blockingReason = "Doubao voice is not configured.";
  } else if (!voiceConfigured && providerMode === "cloud") {
    blockingReason = "Doubao voice is not configured.";
  } else if (!apiContractConfigured && providerMode === "cloud") {
    blockingReason = "Doubao voice is not configured.";
  } else if (!ownerApproved) {
    blockingReason = "Doubao voice owner approval is required.";
  } else if (!runtimeActive) {
    blockingReason = "Doubao voice is not active.";
  } else if (!productionGateOk) {
    blockingReason = "Doubao voice is blocked on production.";
  }

  const canGenerateAudio =
    credentialsConfigured &&
    voiceConfigured &&
    (providerMode === "local" || apiContractConfigured) &&
    ownerApproved &&
    runtimeActive &&
    productionGateOk;

  return {
    providerMode,
    apiContractConfigured,
    credentialsConfigured,
    voiceConfigured,
    ownerApproved,
    runtimeActive,
    productionBlocked,
    productionAllowed,
    canGenerateAudio,
    blockingReason,
    cloud: {
      apiUrl,
      appId,
      cluster,
      voiceId,
      language: readEnv("DOUBAO_TTS_LANGUAGE", env) ?? "zh-CN",
      outputFormat: resolveOutputFormat(env),
      accessTokenPresent: Boolean(accessToken),
    },
    local: {
      baseUrl: localBase,
      voice: localVoice,
    },
  };
}

/** Map internal blocking reasons to owner-safe copy (no env/secret names). */
export function mapDoubaoTtsOwnerError(reason: string | null | undefined): string {
  if (!reason) return "Doubao voice is temporarily unavailable.";
  if (/not configured|credentials|VOICE_ID|API_URL|APP_ID/i.test(reason)) {
    return "Doubao voice is not configured.";
  }
  if (/owner approval|OWNER_APPROVED/i.test(reason)) {
    return "Doubao voice is not configured.";
  }
  if (/not active|ACTIVE/i.test(reason)) {
    return "Doubao voice is temporarily unavailable.";
  }
  if (/production/i.test(reason)) {
    return "Doubao voice is temporarily unavailable.";
  }
  return "Doubao voice is temporarily unavailable.";
}
