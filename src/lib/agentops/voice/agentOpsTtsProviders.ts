/**
 * AgentOps TTS providers — Doubao (preferred) + browser speechSynthesis fallback.
 */

import {
  chunkAgentOpsTtsText,
  normalizeAgentOpsTtsSpeakText,
} from "./agentOpsTtsNormalize";

export type AgentOpsTtsProviderId = "doubao" | "browser";

export type AgentOpsTtsProviderStatus =
  | "doubao"
  | "browser"
  | "unavailable";

export type AgentOpsTtsSpeakInput = {
  messageId: string;
  text: string;
  signal?: AbortSignal;
};

export type AgentOpsTtsProvider = {
  id: AgentOpsTtsProviderId;
  isAvailable: () => Promise<boolean>;
  speak: (input: AgentOpsTtsSpeakInput) => Promise<void>;
  stop: () => void;
};

const VOICE_API_PATH = "/api/agentops/voice";

export type AgentOpsVoiceServerStatus = {
  ok: boolean;
  provider?: "doubao";
  configured?: boolean;
  active?: boolean;
  canGenerateAudio?: boolean;
  blockingReason?: string | null;
  error?: string;
};

export async function fetchAgentOpsVoiceStatus(
  signal?: AbortSignal,
): Promise<AgentOpsVoiceServerStatus> {
  try {
    const response = await fetch(`${VOICE_API_PATH}?action=status`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
    const json = (await response.json()) as AgentOpsVoiceServerStatus;
    if (!response.ok) {
      return {
        ok: false,
        error: json.error ?? "Doubao voice is temporarily unavailable.",
      };
    }
    return { ...json, ok: true };
  } catch {
    return { ok: false, error: "Doubao voice is temporarily unavailable." };
  }
}

function createBrowserSpeechProvider(): AgentOpsTtsProvider {
  let currentUtterance: SpeechSynthesisUtterance | null = null;

  return {
    id: "browser",
    async isAvailable() {
      return typeof window !== "undefined" && Boolean(window.speechSynthesis);
    },
    async speak(input) {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        throw new Error("No text-to-speech provider is available.");
      }
      const text = normalizeAgentOpsTtsSpeakText(input.text);
      if (!text) return;

      window.speechSynthesis.cancel();
      await new Promise<void>((resolve, reject) => {
        if (input.signal?.aborted) {
          reject(new Error("aborted"));
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        currentUtterance = utterance;
        const onAbort = () => {
          window.speechSynthesis.cancel();
          reject(new Error("aborted"));
        };
        input.signal?.addEventListener("abort", onAbort, { once: true });
        utterance.onend = () => {
          input.signal?.removeEventListener("abort", onAbort);
          if (currentUtterance === utterance) currentUtterance = null;
          resolve();
        };
        utterance.onerror = () => {
          input.signal?.removeEventListener("abort", onAbort);
          if (currentUtterance === utterance) currentUtterance = null;
          reject(new Error("Speech output failed."));
        };
        window.speechSynthesis.speak(utterance);
      });
    },
    stop() {
      currentUtterance = null;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    },
  };
}

function createDoubaoTtsProvider(): AgentOpsTtsProvider {
  let activeAudio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;

  const revoke = () => {
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.src = "";
      } catch {
        // ignore
      }
      activeAudio = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  };

  return {
    id: "doubao",
    async isAvailable() {
      const status = await fetchAgentOpsVoiceStatus();
      return Boolean(status.ok && status.canGenerateAudio);
    },
    async speak(input) {
      const normalized = normalizeAgentOpsTtsSpeakText(input.text);
      if (!normalized) return;
      const chunks = chunkAgentOpsTtsText(normalized);
      revoke();

      for (const chunk of chunks) {
        if (input.signal?.aborted) throw new Error("aborted");
        const response = await fetch(VOICE_API_PATH, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "audio/mpeg, application/json",
          },
          body: JSON.stringify({ action: "tts", text: chunk }),
          signal: input.signal,
        });

        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || contentType.includes("application/json")) {
          let error = "Doubao voice is temporarily unavailable.";
          try {
            const json = (await response.json()) as { error?: string };
            if (typeof json.error === "string" && json.error.trim()) error = json.error.trim();
          } catch {
            // ignore
          }
          throw new Error(error);
        }

        const blob = await response.blob();
        if (!blob.size) throw new Error("Doubao voice is temporarily unavailable.");
        revoke();
        objectUrl = URL.createObjectURL(blob);
        const audio = new Audio(objectUrl);
        activeAudio = audio;
        await new Promise<void>((resolve, reject) => {
          const onAbort = () => {
            revoke();
            reject(new Error("aborted"));
          };
          input.signal?.addEventListener("abort", onAbort, { once: true });
          audio.onended = () => {
            input.signal?.removeEventListener("abort", onAbort);
            resolve();
          };
          audio.onerror = () => {
            input.signal?.removeEventListener("abort", onAbort);
            reject(new Error("Doubao voice is temporarily unavailable."));
          };
          void audio.play().catch((error) => {
            input.signal?.removeEventListener("abort", onAbort);
            reject(error instanceof Error ? error : new Error("Playback blocked."));
          });
        });
      }
    },
    stop() {
      revoke();
    },
  };
}

export const agentOpsBrowserSpeechProvider = createBrowserSpeechProvider();
export const agentOpsDoubaoTtsProvider = createDoubaoTtsProvider();
