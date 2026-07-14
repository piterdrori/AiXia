import { useCallback, useEffect, useState } from "react";

import {
  getAgentOpsTtsEnabled,
  setAgentOpsTtsEnabled,
  subscribeAgentOpsTtsPreference,
} from "@/lib/agentops/agentOpsTtsPreference";

/**
 * Shared AgentOps TTS preference across all messenger shells.
 * Never stores microphone/listening state.
 */
export function useAgentOpsTtsPreference() {
  const [ttsEnabled, setTtsEnabledState] = useState(false);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);

  useEffect(() => {
    setTtsEnabledState(getAgentOpsTtsEnabled());
    setPreferenceLoaded(true);
    return subscribeAgentOpsTtsPreference((enabled) => {
      setTtsEnabledState(enabled);
    });
  }, []);

  const setTtsEnabled = useCallback((enabled: boolean | ((current: boolean) => boolean)) => {
    const current = getAgentOpsTtsEnabled();
    const next = typeof enabled === "function" ? enabled(current) : Boolean(enabled);
    setAgentOpsTtsEnabled(next);
  }, []);

  const toggleTts = useCallback(() => {
    setTtsEnabled((current) => !current);
  }, [setTtsEnabled]);

  return {
    ttsEnabled,
    setTtsEnabled,
    toggleTts,
    preferenceLoaded,
    hydrated: preferenceLoaded,
  };
}
