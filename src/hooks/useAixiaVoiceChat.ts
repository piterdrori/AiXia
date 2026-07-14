import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAgentOpsTtsPreference } from "@/hooks/useAgentOpsTtsPreference";
import { supabase } from "@/lib/supabase";

export interface AixiaVoiceRuntimeSettings {
  voice_enabled: boolean;
  voice_tts_enabled: boolean;
  voice_stt_enabled: boolean;
  voice_name: string;
  voice_speed: number;
  voice_pitch: number;
}

type AiSettingRow = {
  setting_key: string;
  setting_value?: { value?: unknown };
};

type SpeechRecognitionAlternativeLike = {
  transcript?: string;
};

type SpeechRecognitionResultLike = {
  isFinal?: boolean;
  0: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type AgentOpsBrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type AgentOpsBrowserSpeechRecognitionConstructor = new () => AgentOpsBrowserSpeechRecognition;

const defaultVoiceSettings: AixiaVoiceRuntimeSettings = {
  voice_enabled: false,
  voice_tts_enabled: true,
  voice_stt_enabled: true,
  voice_name: "alloy",
  voice_speed: 1.15,
  voice_pitch: 50,
};

function readSettingValue(row: AiSettingRow) {
  return row.setting_value?.value;
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: AgentOpsBrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: AgentOpsBrowserSpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function clampSpeechRate(value: number) {
  if (!Number.isFinite(value)) return 1.15;
  return Math.min(2, Math.max(0.5, value));
}

function convertPitchToBrowserPitch(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(2, Math.max(0, value / 50));
}

/**
 * Per-messenger voice controller: shares global TTS preference; keeps STT local/ephemeral.
 */
export function useAixiaVoiceChat() {
  const [voiceSettings, setVoiceSettings] =
    useState<AixiaVoiceRuntimeSettings>(defaultVoiceSettings);
  const { ttsEnabled, setTtsEnabled, toggleTts, preferenceLoaded } = useAgentOpsTtsPreference();
  const [listening, setListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const recognitionRef = useRef<AgentOpsBrowserSpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const utteranceGenerationRef = useRef(0);

  const speechSupported = useMemo(() => Boolean(getSpeechRecognitionConstructor()), []);
  const ttsSupported = useMemo(
    () => typeof window !== "undefined" && Boolean(window.speechSynthesis),
    [],
  );

  const sttAvailable =
    speechSupported && voiceSettings.voice_stt_enabled && voiceSettings.voice_enabled;
  const ttsAvailable =
    ttsSupported && voiceSettings.voice_tts_enabled && voiceSettings.voice_enabled;

  const loadVoiceSettings = useCallback(async () => {
    const settingKeys = [
      "voice_enabled",
      "voice_tts_enabled",
      "voice_stt_enabled",
      "voice_name",
      "voice_speed",
      "voice_pitch",
    ];

    const { data, error } = await supabase
      .from("ai_settings")
      .select("setting_key, setting_value")
      .in("setting_key", settingKeys);

    if (error) {
      console.error("Voice settings load error:", error);
      return;
    }

    const next = { ...defaultVoiceSettings };
    (data as AiSettingRow[] | null)?.forEach((row) => {
      const value = readSettingValue(row);
      if (row.setting_key === "voice_enabled") next.voice_enabled = value === true;
      if (row.setting_key === "voice_tts_enabled") next.voice_tts_enabled = value !== false;
      if (row.setting_key === "voice_stt_enabled") next.voice_stt_enabled = value !== false;
      if (row.setting_key === "voice_name" && typeof value === "string") next.voice_name = value;
      if (row.setting_key === "voice_speed" && typeof value === "number") next.voice_speed = value;
      if (row.setting_key === "voice_pitch" && typeof value === "number") next.voice_pitch = value;
    });
    setVoiceSettings(next);
  }, []);

  useEffect(() => {
    void loadVoiceSettings();
  }, [loadVoiceSettings]);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const stopVoiceOutput = useCallback(() => {
    utteranceGenerationRef.current += 1;
    setIsSpeaking(false);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }, []);

  // Turning preference OFF cancels active / queued browser speech immediately.
  useEffect(() => {
    if (!ttsEnabled) {
      stopVoiceOutput();
      setVoiceStatus((current) =>
        current === "Speaking agent reply…" ? null : current,
      );
    }
  }, [ttsEnabled, stopVoiceOutput]);

  const speakAgentMessage = useCallback(
    (text: string) => {
      if (!ttsEnabled) return;
      if (!ttsAvailable) {
        setVoiceStatus("Browser speech output is unavailable.");
        return;
      }
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setVoiceStatus("Browser speech output is unavailable.");
        return;
      }

      const trimmed = text.trim();
      if (!trimmed) return;

      stopVoiceOutput();
      const generation = utteranceGenerationRef.current;
      try {
        const utterance = new SpeechSynthesisUtterance(trimmed);
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find((voice) =>
          voice.name.toLowerCase().includes(voiceSettings.voice_name.toLowerCase()),
        );
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = clampSpeechRate(voiceSettings.voice_speed);
        utterance.pitch = convertPitchToBrowserPitch(voiceSettings.voice_pitch);
        utterance.onstart = () => {
          if (utteranceGenerationRef.current !== generation) return;
          setIsSpeaking(true);
          setVoiceStatus("Speaking agent reply…");
        };
        utterance.onend = () => {
          if (utteranceGenerationRef.current !== generation) return;
          setIsSpeaking(false);
          setVoiceStatus(null);
        };
        utterance.onerror = () => {
          if (utteranceGenerationRef.current !== generation) return;
          setIsSpeaking(false);
          setVoiceStatus("Speech output failed.");
          // Preference stays ON — never flip OFF on playback failure.
        };
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
        setVoiceStatus("Speech output failed.");
      }
    },
    [stopVoiceOutput, ttsAvailable, ttsEnabled, voiceSettings],
  );

  const startListening = useCallback(
    (onTranscript: (transcript: string, isFinal: boolean) => void) => {
      if (!sttAvailable) {
        setVoiceStatus(
          voiceSettings.voice_enabled
            ? "Speech input disabled in AI Management → Voice."
            : "Voice features disabled in AI Management → Voice.",
        );
        return;
      }

      const RecognitionConstructor = getSpeechRecognitionConstructor();
      if (!RecognitionConstructor) {
        setVoiceStatus("Browser speech recognition is unavailable.");
        return;
      }

      stopListening();
      finalTranscriptRef.current = "";

      const recognition = new RecognitionConstructor() as AgentOpsBrowserSpeechRecognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (event) => {
        let interim = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript ?? "";
          if (result?.isFinal) {
            finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcript}`.trim();
            onTranscript(finalTranscriptRef.current, true);
          } else {
            interim = `${interim} ${transcript}`.trim();
            onTranscript(`${finalTranscriptRef.current} ${interim}`.trim(), false);
          }
        }
      };
      recognition.onerror = (event) => {
        setVoiceStatus(event.error ? `Mic error: ${event.error}` : "Mic error.");
        stopListening();
      };
      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      setListening(true);
      setVoiceStatus("Listening…");
      try {
        recognition.start();
      } catch {
        setVoiceStatus("Mic error.");
        stopListening();
      }
    },
    [sttAvailable, stopListening, voiceSettings.voice_enabled],
  );

  const toggleMic = useCallback(
    (onTranscript: (transcript: string, isFinal: boolean) => void) => {
      if (listening) {
        stopListening();
        setVoiceStatus(null);
        return;
      }
      startListening(onTranscript);
    },
    [listening, startListening, stopListening],
  );

  useEffect(() => {
    return () => {
      stopListening();
      stopVoiceOutput();
    };
  }, [stopListening, stopVoiceOutput]);

  return {
    voiceSettings,
    /** Owner preference (global). Does not flip on playback failure. */
    ttsEnabled,
    setTtsEnabled,
    toggleTts,
    preferenceLoaded,
    listening,
    isSpeaking,
    voiceStatus,
    speechSupported,
    ttsSupported,
    sttAvailable,
    /** Provider + AI Management capability gate. */
    ttsAvailable,
    toggleMic,
    stopListening,
    stopVoiceOutput,
    speakAgentMessage,
    reloadVoiceSettings: loadVoiceSettings,
  };
}
