/**
 * Server-side Doubao OpenSpeech flash ASR config — env only.
 * Selective Phase C recovery from untracked doubaoAsrConfig (static Preview-safe reads).
 */

import { isAgentOpsProductionBlocked } from "./ollamaProxy.js";

export const DOUBAO_STT_DEFAULT_HTTP_API_URL =
  "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash";

export const DOUBAO_STT_MAX_AUDIO_BYTES = 2 * 1024 * 1024;
export const DOUBAO_STT_MAX_DURATION_MS = 45_000;
export const DOUBAO_STT_MAX_TRANSCRIPT_CHARS = 4_000;

export const DOUBAO_STT_ALLOWED_FORMATS = new Set([
  "wav",
  "mp3",
  "ogg",
  "webm",
  "m4a",
  "pcm",
]);

export type DoubaoSttServerConfig = {
  credentialsConfigured: boolean;
  resourceIdConfigured: boolean;
  httpEndpointConfigured: boolean;
  ownerApproved: boolean;
  runtimeActive: boolean;
  productionBlocked: boolean;
  productionAllowed: boolean;
  canTranscribe: boolean;
  blockingReason: string | null;
  httpApiUrl: string;
  resourceId: string | null;
  language: string;
  appId: string | null;
  accessTokenPresent: boolean;
};

function readEnv(name: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const fromArg = env[name];
  if (typeof fromArg === "string" && fromArg.trim()) return fromArg.trim();

  const staticMap: Record<string, string | undefined> = {
    DOUBAO_STT_APP_ID: process.env.DOUBAO_STT_APP_ID,
    DOUBAO_ASR_APP_KEY: process.env.DOUBAO_ASR_APP_KEY,
    DOUBAO_TTS_APP_ID: process.env.DOUBAO_TTS_APP_ID,
    DOUBAO_STT_ACCESS_TOKEN: process.env.DOUBAO_STT_ACCESS_TOKEN,
    DOUBAO_ASR_ACCESS_KEY: process.env.DOUBAO_ASR_ACCESS_KEY,
    DOUBAO_ASR_API_KEY: process.env.DOUBAO_ASR_API_KEY,
    DOUBAO_TTS_API_KEY: process.env.DOUBAO_TTS_API_KEY,
    DOUBAO_STT_HTTP_API_URL: process.env.DOUBAO_STT_HTTP_API_URL,
    DOUBAO_STT_API_URL: process.env.DOUBAO_STT_API_URL,
    DOUBAO_STT_RESOURCE_ID: process.env.DOUBAO_STT_RESOURCE_ID,
    DOUBAO_ASR_RESOURCE_ID: process.env.DOUBAO_ASR_RESOURCE_ID,
    DOUBAO_STT_DEFAULT_LANGUAGE: process.env.DOUBAO_STT_DEFAULT_LANGUAGE,
    DOUBAO_ASR_LANGUAGE: process.env.DOUBAO_ASR_LANGUAGE,
    DOUBAO_STT_ACTIVE: process.env.DOUBAO_STT_ACTIVE,
    DOUBAO_STT_OWNER_APPROVED: process.env.DOUBAO_STT_OWNER_APPROVED,
    AGENTOPS_DOUBAO_STT_ACTIVE: process.env.AGENTOPS_DOUBAO_STT_ACTIVE,
    AGENTOPS_DOUBAO_STT_OWNER_APPROVED: process.env.AGENTOPS_DOUBAO_STT_OWNER_APPROVED,
    DOUBAO_STT_PRODUCTION_ALLOWED: process.env.DOUBAO_STT_PRODUCTION_ALLOWED,
    AGENTOPS_DOUBAO_ASR_PRODUCTION_ALLOWED: process.env.AGENTOPS_DOUBAO_ASR_PRODUCTION_ALLOWED,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  const value = staticMap[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function resolveAppId(env: NodeJS.ProcessEnv): string | undefined {
  return (
    readEnv("DOUBAO_STT_APP_ID", env) ??
    readEnv("DOUBAO_ASR_APP_KEY", env) ??
    readEnv("DOUBAO_TTS_APP_ID", env)
  );
}

export function getDoubaoSttAccessToken(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return (
    readEnv("DOUBAO_STT_ACCESS_TOKEN", env) ??
    readEnv("DOUBAO_ASR_ACCESS_KEY", env) ??
    readEnv("DOUBAO_ASR_API_KEY", env) ??
    readEnv("DOUBAO_TTS_API_KEY", env)
  );
}

function resolveHttpApiUrl(env: NodeJS.ProcessEnv): string {
  const explicit = readEnv("DOUBAO_STT_HTTP_API_URL", env);
  if (explicit) return explicit.replace(/\/+$/, "");
  const apiUrl = readEnv("DOUBAO_STT_API_URL", env);
  if (apiUrl && apiUrl.includes("/auc/")) return apiUrl.replace(/\/+$/, "");
  return DOUBAO_STT_DEFAULT_HTTP_API_URL;
}

export function isDoubaoSttOwnerApproved(env: NodeJS.ProcessEnv = process.env): boolean {
  const dedicated =
    readEnv("AGENTOPS_DOUBAO_STT_OWNER_APPROVED", env) ??
    readEnv("DOUBAO_STT_OWNER_APPROVED", env);
  return dedicated === "true";
}

export function isDoubaoSttRuntimeActive(env: NodeJS.ProcessEnv = process.env): boolean {
  const dedicated =
    readEnv("AGENTOPS_DOUBAO_STT_ACTIVE", env) ?? readEnv("DOUBAO_STT_ACTIVE", env);
  return dedicated === "true";
}

export function isDoubaoSttProductionAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    readEnv("DOUBAO_STT_PRODUCTION_ALLOWED", env) === "true" ||
    readEnv("AGENTOPS_DOUBAO_ASR_PRODUCTION_ALLOWED", env) === "true"
  );
}

export function getDoubaoSttServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): DoubaoSttServerConfig {
  const appId = resolveAppId(env) ?? null;
  const accessToken = getDoubaoSttAccessToken(env);
  const resourceId =
    readEnv("DOUBAO_STT_RESOURCE_ID", env) ??
    readEnv("DOUBAO_ASR_RESOURCE_ID", env) ??
    "volc.bigasr.auc_turbo";
  const httpApiUrl = resolveHttpApiUrl(env);

  const credentialsConfigured = Boolean(appId && accessToken);
  const resourceIdConfigured = Boolean(resourceId);
  const httpEndpointConfigured =
    httpApiUrl.startsWith("https://") &&
    httpApiUrl.includes("openspeech.bytedance.com") &&
    httpApiUrl.includes("/auc/") &&
    httpApiUrl.includes("recognize");

  const ownerApproved = isDoubaoSttOwnerApproved(env);
  const runtimeActive = isDoubaoSttRuntimeActive(env);
  const productionBlocked =
    readEnv("VERCEL_ENV", env) === "production" || isAgentOpsProductionBlocked();
  const productionAllowed = isDoubaoSttProductionAllowed(env);
  const productionGateOk = !productionBlocked || productionAllowed;

  let blockingReason: string | null = null;
  if (!credentialsConfigured || !resourceIdConfigured || !httpEndpointConfigured) {
    blockingReason = "Doubao speech recognition is not configured.";
  } else if (!ownerApproved) {
    blockingReason = "Doubao speech recognition owner approval is required.";
  } else if (!runtimeActive) {
    blockingReason = "Doubao speech recognition is not active.";
  } else if (!productionGateOk) {
    blockingReason = "Doubao speech recognition is blocked on production.";
  }

  const canTranscribe =
    credentialsConfigured &&
    resourceIdConfigured &&
    httpEndpointConfigured &&
    ownerApproved &&
    runtimeActive &&
    productionGateOk;

  return {
    credentialsConfigured,
    resourceIdConfigured,
    httpEndpointConfigured,
    ownerApproved,
    runtimeActive,
    productionBlocked,
    productionAllowed,
    canTranscribe,
    blockingReason,
    httpApiUrl,
    resourceId,
    language:
      readEnv("DOUBAO_STT_DEFAULT_LANGUAGE", env) ??
      readEnv("DOUBAO_ASR_LANGUAGE", env) ??
      "en-US",
    appId,
    accessTokenPresent: Boolean(accessToken),
  };
}

export function mapDoubaoSttOwnerError(reason: string | null | undefined): string {
  if (!reason) return "Speech recognition is temporarily unavailable.";
  if (/not configured|credentials|RESOURCE|HTTP|APP_ID|token/i.test(reason)) {
    return "Doubao speech recognition is not configured.";
  }
  if (/owner approval|OWNER_APPROVED/i.test(reason)) {
    return "Doubao speech recognition is not configured.";
  }
  if (/not active|ACTIVE/i.test(reason)) {
    return "Speech recognition is temporarily unavailable.";
  }
  if (/production/i.test(reason)) {
    return "Speech recognition is temporarily unavailable.";
  }
  return "Speech recognition is temporarily unavailable.";
}

export function mimeToDoubaoSttFormat(mimeType: string): string | null {
  const mime = mimeType.toLowerCase();
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("m4a") || mime.includes("mp4")) return "m4a";
  if (mime.includes("pcm")) return "pcm";
  return null;
}
