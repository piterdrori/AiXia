/**
 * Canonical AgentOps TTS owner preference (browser-profile localStorage).
 * Only stores the boolean toggle — never mic, playback, thread, or agent identity.
 */

export const AGENTOPS_TTS_ENABLED_STORAGE_KEY = "agentops.tts.enabled" as const;

/** Same-tab subscribers (storage events do not fire in the writing tab). */
export const AGENTOPS_TTS_PREFERENCE_CHANGE_EVENT = "agentops:tts-preference-change";

export type AgentOpsTtsPreferenceChangeDetail = {
  enabled: boolean;
  source: "set" | "storage" | "hydrate";
};

const DEFAULT_TTS_ENABLED = false;

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseStoredValue(raw: string | null): boolean | null {
  if (raw === null) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return null;
}

/**
 * Read owner TTS preference.
 * Absent / invalid / storage failure → OFF (first-time default).
 */
export function getAgentOpsTtsEnabled(): boolean {
  if (!canUseLocalStorage()) return DEFAULT_TTS_ENABLED;
  try {
    const parsed = parseStoredValue(window.localStorage.getItem(AGENTOPS_TTS_ENABLED_STORAGE_KEY));
    return parsed === null ? DEFAULT_TTS_ENABLED : parsed;
  } catch {
    return DEFAULT_TTS_ENABLED;
  }
}

export function setAgentOpsTtsEnabled(enabled: boolean): void {
  const next = Boolean(enabled);
  if (canUseLocalStorage()) {
    try {
      window.localStorage.setItem(AGENTOPS_TTS_ENABLED_STORAGE_KEY, next ? "true" : "false");
    } catch {
      // Keep in-memory subscribers updated even when persistence fails.
    }
  }
  dispatchPreferenceChange(next, "set");
}

function dispatchPreferenceChange(
  enabled: boolean,
  source: AgentOpsTtsPreferenceChangeDetail["source"],
): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent<AgentOpsTtsPreferenceChangeDetail>(AGENTOPS_TTS_PREFERENCE_CHANGE_EVENT, {
        detail: { enabled, source },
      }),
    );
  } catch {
    // ignore
  }
}

export function subscribeAgentOpsTtsPreference(
  listener: (enabled: boolean, meta: AgentOpsTtsPreferenceChangeDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const onSameTab = (event: Event) => {
    const detail = (event as CustomEvent<AgentOpsTtsPreferenceChangeDetail>).detail;
    if (!detail || typeof detail.enabled !== "boolean") return;
    listener(detail.enabled, detail);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== AGENTOPS_TTS_ENABLED_STORAGE_KEY) return;
    const parsed = parseStoredValue(event.newValue);
    const enabled = parsed === null ? DEFAULT_TTS_ENABLED : parsed;
    listener(enabled, { enabled, source: "storage" });
  };

  window.addEventListener(AGENTOPS_TTS_PREFERENCE_CHANGE_EVENT, onSameTab as EventListener);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(AGENTOPS_TTS_PREFERENCE_CHANGE_EVENT, onSameTab as EventListener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Test helper: parse raw storage strings without touching localStorage. */
export function parseAgentOpsTtsPreferenceStoredValue(raw: string | null): boolean {
  const parsed = parseStoredValue(raw);
  return parsed === null ? DEFAULT_TTS_ENABLED : parsed;
}

export function getAgentOpsTtsPreferenceDefault(): boolean {
  return DEFAULT_TTS_ENABLED;
}
