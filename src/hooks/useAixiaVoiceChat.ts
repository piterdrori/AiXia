import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAgentOpsTtsPreference } from "@/hooks/useAgentOpsTtsPreference";
import {
  AgentOpsSttCaptureSession,
  agentOpsSttCaptureSupported,
} from "@/lib/agentops/voice/agentOpsSttCapture";
import { transcribeAgentOpsStt } from "@/lib/agentops/voice/agentOpsSttClient";
import {
  isAgentOpsSttBusy,
  probeAgentOpsDoubaoTtsAvailable,
  setAgentOpsSttBusy,
  speakAgentOpsTts,
  stopAgentOpsTtsPlayback,
} from "@/lib/agentops/voice/agentOpsTtsPlayback";
import {
  probeAgentOpsDoubaoSttAvailable,
  type AgentOpsTtsProviderStatus,
} from "@/lib/agentops/voice/agentOpsTtsProviders";
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
  setting_value: { value?: unknown } | null;
};

export type AgentOpsSttProviderStatus = "doubao" | "browser" | "unavailable";
export type AgentOpsSttPhase =
  | "idle"
  | "requesting"
  | "recording"
  | "processing"
  | "ready"
  | "error";

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

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal?: boolean;
    0?: { transcript?: string };
  }>;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
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

function appendTranscript(existing: string, transcript: string): string {
  const next = transcript.trim();
  if (!next) return existing;
  const current = existing.trimEnd();
  if (!current) return next;
  return `${current} ${next}`;
}

/**
 * Per-messenger voice controller: shared TTS preference + Doubao STT push-to-talk.
 */
export function useAixiaVoiceChat() {
  const [voiceSettings, setVoiceSettings] =
    useState<AixiaVoiceRuntimeSettings>(defaultVoiceSettings);
  const { ttsEnabled, setTtsEnabled, toggleTts, preferenceLoaded } = useAgentOpsTtsPreference();
  const [listening, setListening] = useState(false);
  const [sttPhase, setSttPhase] = useState<AgentOpsSttPhase>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [ttsProvider, setTtsProvider] = useState<AgentOpsTtsProviderStatus>("unavailable");
  const [sttProvider, setSttProvider] = useState<AgentOpsSttProviderStatus>("unavailable");
  const [doubaoConfigured, setDoubaoConfigured] = useState(false);
  const [doubaoSttConfigured, setDoubaoSttConfigured] = useState(false);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const recognitionRef = useRef<AgentOpsBrowserSpeechRecognition | null>(null);
  const captureRef = useRef<AgentOpsSttCaptureSession | null>(null);
  const sttAbortRef = useRef<AbortController | null>(null);
  const speakGenerationRef = useRef(0);
  const recordingTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const browserFallbackHintRef = useRef(false);

  const speechSupported = useMemo(() => Boolean(getSpeechRecognitionConstructor()), []);
  const mediaCaptureSupported = useMemo(() => agentOpsSttCaptureSupported(), []);
  const browserTtsSupported = useMemo(
    () => typeof window !== "undefined" && Boolean(window.speechSynthesis),
    [],
  );

  const managementSttGate =
    voiceSettings.voice_stt_enabled && voiceSettings.voice_enabled;
  const sttAvailable =
    managementSttGate && (doubaoSttConfigured || (mediaCaptureSupported && speechSupported));
  const managementTtsGate =
    voiceSettings.voice_tts_enabled && voiceSettings.voice_enabled;
  const ttsAvailable =
    managementTtsGate && (doubaoConfigured || browserTtsSupported);

  const clearRecordingTick = useCallback(() => {
    if (recordingTickRef.current) {
      clearInterval(recordingTickRef.current);
      recordingTickRef.current = null;
    }
    setRecordingElapsedMs(0);
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [ttsOk, sttOk] = await Promise.all([
        probeAgentOpsDoubaoTtsAvailable(),
        probeAgentOpsDoubaoSttAvailable(),
      ]);
      if (cancelled) return;
      setDoubaoConfigured(ttsOk);
      setDoubaoSttConfigured(sttOk);
      if (ttsOk) setTtsProvider((current) => (current === "unavailable" ? "doubao" : current));
      if (sttOk) setSttProvider("doubao");
      else if (speechSupported) setSttProvider("browser");
      else setSttProvider("unavailable");
    })();
    return () => {
      cancelled = true;
    };
  }, [speechSupported]);

  const stopBrowserRecognition = useCallback(() => {
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
  }, []);

  const stopVoiceOutput = useCallback(() => {
    speakGenerationRef.current += 1;
    stopAgentOpsTtsPlayback();
    setIsSpeaking(false);
  }, []);

  const cancelStt = useCallback(() => {
    sttAbortRef.current?.abort();
    sttAbortRef.current = null;
    captureRef.current?.cancel();
    captureRef.current = null;
    stopBrowserRecognition();
    clearRecordingTick();
    setAgentOpsSttBusy(false);
    setListening(false);
    setSttPhase("idle");
    setVoiceStatus(null);
  }, [clearRecordingTick, stopBrowserRecognition]);

  useEffect(() => {
    if (!ttsEnabled) {
      stopVoiceOutput();
      setVoiceStatus((current) =>
        current && /Speaking|Doubao|browser voice/i.test(current) ? null : current,
      );
    }
  }, [ttsEnabled, stopVoiceOutput]);

  const speakAgentMessage = useCallback(
    async (text: string, messageId = `msg-${Date.now()}`) => {
      if (!ttsEnabled) return;
      if (isAgentOpsSttBusy()) return;
      if (!managementTtsGate) {
        setVoiceStatus("Voice features disabled in AI Management → Voice.");
        setTtsProvider("unavailable");
        return;
      }

      const trimmed = text.trim();
      if (!trimmed) return;

      stopVoiceOutput();
      const generation = speakGenerationRef.current + 1;
      speakGenerationRef.current = generation;
      setIsSpeaking(true);
      setVoiceStatus("Speaking agent reply…");

      try {
        const result = await speakAgentOpsTts({
          messageId,
          text: trimmed,
          ttsEnabled: true,
          browserCapabilityAvailable: browserTtsSupported,
        });
        if (speakGenerationRef.current !== generation) return;
        setTtsProvider(result.provider);
        if (result.statusText) {
          setVoiceStatus(result.statusText);
        } else if (result.provider === "browser") {
          setVoiceStatus("Using browser voice.");
        } else {
          setVoiceStatus(null);
        }
      } catch {
        if (speakGenerationRef.current !== generation) return;
        setTtsProvider("unavailable");
        setVoiceStatus("No text-to-speech provider is available.");
      } finally {
        if (speakGenerationRef.current === generation) {
          setIsSpeaking(false);
        }
      }
    },
    [browserTtsSupported, managementTtsGate, stopVoiceOutput, ttsEnabled],
  );

  const runBrowserFallbackStt = useCallback(
    (onTranscript: (transcript: string, isFinal: boolean) => void) => {
      const RecognitionConstructor = getSpeechRecognitionConstructor();
      if (!RecognitionConstructor) {
        setSttProvider("unavailable");
        setSttPhase("error");
        setVoiceStatus("No speech recognition provider is available.");
        setAgentOpsSttBusy(false);
        return;
      }

      stopBrowserRecognition();
      browserFallbackHintRef.current = true;
      setSttProvider("browser");
      setSttPhase("recording");
      setListening(true);
      setVoiceStatus(
        doubaoSttConfigured
          ? "Doubao unavailable — speak again using browser voice"
          : "Mic · Browser fallback — listening…",
      );

      const recognition = new RecognitionConstructor() as AgentOpsBrowserSpeechRecognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (event) => {
        let interim = "";
        let finalText = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript ?? "";
          if (result?.isFinal) finalText = `${finalText} ${transcript}`.trim();
          else interim = `${interim} ${transcript}`.trim();
        }
        if (finalText) {
          onTranscript(finalText, true);
          setSttPhase("ready");
          setVoiceStatus("Transcript ready — review before sending.");
        } else if (interim) {
          onTranscript(interim, false);
        }
      };
      recognition.onerror = (event) => {
        setSttPhase("error");
        setVoiceStatus(
          event.error === "not-allowed"
            ? "Microphone permission denied."
            : event.error === "no-speech"
              ? "No speech detected."
              : "Mic error.",
        );
        setListening(false);
        setAgentOpsSttBusy(false);
        recognitionRef.current = null;
      };
      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
        setAgentOpsSttBusy(false);
        setSttPhase((phase) => (phase === "recording" ? "idle" : phase));
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        setSttPhase("error");
        setVoiceStatus("Mic error.");
        setListening(false);
        setAgentOpsSttBusy(false);
      }
    },
    [doubaoSttConfigured, stopBrowserRecognition],
  );

  const finishDoubaoRecording = useCallback(
    async (onTranscript: (transcript: string, isFinal: boolean) => void) => {
      const session = captureRef.current;
      clearRecordingTick();
      setListening(false);
      setSttPhase("processing");
      setVoiceStatus("Processing speech…");

      let capture: Awaited<ReturnType<AgentOpsSttCaptureSession["stop"]>> = null;
      try {
        capture = session ? await session.stop() : null;
      } catch {
        capture = null;
      }
      captureRef.current = null;

      if (!capture) {
        setSttPhase("error");
        setVoiceStatus("No speech detected.");
        setAgentOpsSttBusy(false);
        return;
      }

      const abort = new AbortController();
      sttAbortRef.current = abort;
      try {
        const result = await transcribeAgentOpsStt({
          audio: capture.blob,
          mimeType: capture.mimeType,
          durationMs: capture.durationMs,
          signal: abort.signal,
        });
        if (abort.signal.aborted) return;
        if (!result.ok || !result.transcript?.trim()) {
          const err = result.error ?? "Speech recognition is temporarily unavailable.";
          if (/No speech/i.test(err)) {
            setSttPhase("error");
            setVoiceStatus("No speech detected.");
            setAgentOpsSttBusy(false);
            return;
          }
          // Honest: recorded blob cannot be fed to browser SpeechRecognition.
          setSttPhase("error");
          setSttProvider(speechSupported ? "browser" : "unavailable");
          setVoiceStatus(
            speechSupported
              ? "Doubao unavailable — tap Mic and speak again for browser voice."
              : "Speech recognition is temporarily unavailable.",
          );
          setAgentOpsSttBusy(false);
          return;
        }

        setSttProvider("doubao");
        onTranscript(result.transcript.trim(), true);
        setSttPhase("ready");
        setVoiceStatus("Transcript ready — review before sending.");
      } catch {
        if (abort.signal.aborted) return;
        setSttPhase("error");
        setVoiceStatus("Speech recognition is temporarily unavailable.");
      } finally {
        sttAbortRef.current = null;
        setAgentOpsSttBusy(false);
      }
    },
    [clearRecordingTick, speechSupported],
  );

  const startDoubaoRecording = useCallback(
    async (onTranscript: (transcript: string, isFinal: boolean) => void) => {
      stopVoiceOutput();
      stopBrowserRecognition();
      setAgentOpsSttBusy(true);
      setSttPhase("requesting");
      setVoiceStatus("Requesting microphone…");
      setSttProvider("doubao");

      const session = new AgentOpsSttCaptureSession();
      captureRef.current = session;
      try {
        await session.start(() => {
          void finishDoubaoRecording(onTranscript);
        });
        setListening(true);
        setSttPhase("recording");
        setVoiceStatus("Recording… tap Mic to stop");
        const started = Date.now();
        clearRecordingTick();
        recordingTickRef.current = setInterval(() => {
          setRecordingElapsedMs(Date.now() - started);
        }, 250);
      } catch (error) {
        captureRef.current = null;
        setAgentOpsSttBusy(false);
        setListening(false);
        setSttPhase("error");
        const name = error instanceof Error ? error.name : "";
        const message = error instanceof Error ? error.message : "";
        if (name === "NotAllowedError" || /Permission|NotAllowed/i.test(message)) {
          setVoiceStatus("Microphone permission denied.");
          return;
        }
        if (name === "NotFoundError") {
          setVoiceStatus("No microphone found.");
          return;
        }
        if (speechSupported) {
          setVoiceStatus("Doubao capture unavailable — using browser voice. Speak now.");
          runBrowserFallbackStt(onTranscript);
          return;
        }
        setVoiceStatus("This browser cannot record microphone audio.");
      }
    },
    [
      clearRecordingTick,
      finishDoubaoRecording,
      runBrowserFallbackStt,
      speechSupported,
      stopBrowserRecognition,
      stopVoiceOutput,
    ],
  );

  const toggleMic = useCallback(
    (onTranscript: (transcript: string, isFinal: boolean) => void) => {
      if (!managementSttGate) {
        setVoiceStatus(
          voiceSettings.voice_enabled
            ? "Speech input disabled in AI Management → Voice."
            : "Voice features disabled in AI Management → Voice.",
        );
        return;
      }

      if (sttPhase === "processing") return;

      if (listening || sttPhase === "recording") {
        if (captureRef.current) {
          void finishDoubaoRecording(onTranscript);
          return;
        }
        stopBrowserRecognition();
        setListening(false);
        setAgentOpsSttBusy(false);
        setSttPhase("idle");
        setVoiceStatus(null);
        return;
      }

      const wrapped = (transcript: string, isFinal: boolean) => {
        // Composer owns append — pass absolute snippet; shell wrapper appends.
        onTranscript(transcript, isFinal);
      };

      if (doubaoSttConfigured && mediaCaptureSupported) {
        void startDoubaoRecording(wrapped);
        return;
      }

      if (speechSupported) {
        stopVoiceOutput();
        setAgentOpsSttBusy(true);
        runBrowserFallbackStt(wrapped);
        return;
      }

      setSttProvider("unavailable");
      setVoiceStatus("No speech recognition provider is available.");
    },
    [
      doubaoSttConfigured,
      finishDoubaoRecording,
      listening,
      managementSttGate,
      mediaCaptureSupported,
      runBrowserFallbackStt,
      speechSupported,
      startDoubaoRecording,
      sttPhase,
      stopBrowserRecognition,
      stopVoiceOutput,
      voiceSettings.voice_enabled,
    ],
  );

  const stopListening = useCallback(() => {
    cancelStt();
  }, [cancelStt]);

  useEffect(() => {
    return () => {
      cancelStt();
      stopVoiceOutput();
    };
  }, [cancelStt, stopVoiceOutput]);

  return {
    voiceSettings,
    ttsEnabled,
    setTtsEnabled,
    toggleTts,
    preferenceLoaded,
    listening,
    sttPhase,
    recordingElapsedMs,
    isSpeaking,
    voiceStatus,
    speechSupported,
    ttsSupported: browserTtsSupported || doubaoConfigured,
    sttAvailable,
    ttsAvailable,
    ttsProvider,
    sttProvider,
    doubaoConfigured,
    doubaoSttConfigured,
    toggleMic,
    stopListening,
    cancelStt,
    stopVoiceOutput,
    speakAgentMessage,
    appendTranscript,
    reloadVoiceSettings: loadVoiceSettings,
  };
}
