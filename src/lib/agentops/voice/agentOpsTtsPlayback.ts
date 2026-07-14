/**
 * Shared AgentOps TTS playback bus — one audible source at a time.
 */

import {
  agentOpsBrowserSpeechProvider,
  agentOpsDoubaoTtsProvider,
  fetchAgentOpsVoiceStatus,
  type AgentOpsTtsProviderStatus,
} from "./agentOpsTtsProviders";

export type AgentOpsTtsPlaybackResult = {
  provider: AgentOpsTtsProviderStatus;
  statusText: string | null;
};

type SpeakRequest = {
  messageId: string;
  text: string;
  ttsEnabled: boolean;
  browserCapabilityAvailable: boolean;
};

let generation = 0;
let abortController: AbortController | null = null;
let cachedDoubaoAvailable: boolean | null = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

/** True while STT is recording or uploading — suppresses auto TTS. */
let sttBusy = false;

export function setAgentOpsSttBusy(busy: boolean): void {
  sttBusy = busy;
  if (busy) stopAgentOpsTtsPlayback();
}

export function isAgentOpsSttBusy(): boolean {
  return sttBusy;
}

export function stopAgentOpsTtsPlayback(): void {
  generation += 1;
  abortController?.abort();
  abortController = null;
  agentOpsDoubaoTtsProvider.stop();
  agentOpsBrowserSpeechProvider.stop();
}

async function resolveDoubaoAvailable(force = false): Promise<boolean> {
  const now = Date.now();
  if (!force && cachedDoubaoAvailable != null && now - cachedAt < CACHE_MS) {
    return cachedDoubaoAvailable;
  }
  const status = await fetchAgentOpsVoiceStatus();
  cachedDoubaoAvailable = Boolean(status.ok && status.canGenerateAudio);
  cachedAt = now;
  return cachedDoubaoAvailable;
}

export async function probeAgentOpsDoubaoTtsAvailable(): Promise<boolean> {
  return resolveDoubaoAvailable(true);
}

/**
 * Prefer Doubao; one browser fallback attempt; never infinite retry.
 * Does not change owner TTS preference.
 */
export async function speakAgentOpsTts(
  input: SpeakRequest,
): Promise<AgentOpsTtsPlaybackResult> {
  if (!input.ttsEnabled) {
    stopAgentOpsTtsPlayback();
    return { provider: "unavailable", statusText: null };
  }

  // Do not speak while mic is recording/transcribing (echo / duplex guard).
  if (sttBusy) {
    return { provider: "unavailable", statusText: null };
  }

  stopAgentOpsTtsPlayback();
  const myGeneration = generation;
  abortController = new AbortController();
  const signal = abortController.signal;

  const doubaoOk = await resolveDoubaoAvailable(false);
  if (myGeneration !== generation) {
    return { provider: "unavailable", statusText: null };
  }

  if (doubaoOk) {
    try {
      await agentOpsDoubaoTtsProvider.speak({
        messageId: input.messageId,
        text: input.text,
        signal,
      });
      if (myGeneration !== generation) {
        return { provider: "doubao", statusText: null };
      }
      return { provider: "doubao", statusText: null };
    } catch {
      if (signal.aborted || myGeneration !== generation) {
        return { provider: "doubao", statusText: null };
      }
      cachedDoubaoAvailable = false;
      cachedAt = Date.now();
      // One browser fallback only.
    }
  }

  if (input.browserCapabilityAvailable) {
    try {
      await agentOpsBrowserSpeechProvider.speak({
        messageId: input.messageId,
        text: input.text,
        signal,
      });
      if (myGeneration !== generation) {
        return { provider: "browser", statusText: "Using browser voice." };
      }
      return {
        provider: "browser",
        statusText: doubaoOk
          ? "Doubao unavailable — using browser voice"
          : "Using browser voice.",
      };
    } catch {
      if (signal.aborted || myGeneration !== generation) {
        return { provider: "browser", statusText: null };
      }
    }
  }

  return {
    provider: "unavailable",
    statusText: "No text-to-speech provider is available.",
  };
}
