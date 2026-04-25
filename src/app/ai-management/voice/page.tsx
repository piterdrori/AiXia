import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Brain,
  CheckCircle2,
  CircleStop,
  Headphones,
  Mic,
  MicOff,
  Play,
  Radio,
  RefreshCcw,
  Save,
  Send,
  SlidersHorizontal,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Volume2,
  Wand2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { askAI } from "@/lib/ai/aiRouter";
import {
  base64ToAudioUrl,
  blobToBase64,
  speakText,
  transcribeAudio,
} from "@/lib/ai/voice";

type VoiceSettings = {
  voice_enabled: boolean;
  voice_tts_enabled: boolean;
  voice_stt_enabled: boolean;
  voice_provider: string;
  voice_stt_model: string;
  voice_tts_model: string;
  voice_name: string;
  voice_style: string;
  voice_speed: number;
  voice_pitch: number;
  voice_stability: number;
  voice_clarity: number;
  voice_notes: string;
};

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  provider?: string;
  model?: string;
  router_layer?: string;
  router_reason?: string;
  matched_question?: string;
  similarity?: number;
};

type InteractionMode =
  | "text"
  | "voice"
  | "avatar"
  | "voice-avatar"
  | "complete";

type AvatarState = "offline" | "idle" | "listening" | "thinking" | "speaking";

type VoiceSlider = {
  key: keyof VoiceSettings;
  label: string;
  lowLabel: string;
  highLabel: string;
  description: string;
  min: number;
  max: number;
  step: number;
};

const defaultVoiceSettings: VoiceSettings = {
  voice_enabled: false,
  voice_tts_enabled: true,
  voice_stt_enabled: true,
  voice_provider: "openai",
  voice_stt_model: "gpt-4o-mini-transcribe",
  voice_tts_model: "gpt-4o-mini-tts",
  voice_name: "alloy",
  voice_style: "professional",
  voice_speed: 1,
  voice_pitch: 50,
  voice_stability: 70,
  voice_clarity: 80,
  voice_notes: "",
};

const voiceSettingKeys = Object.keys(defaultVoiceSettings) as Array<
  keyof VoiceSettings
>;

const voiceSliders: VoiceSlider[] = [
  {
    key: "voice_speed",
    label: "Voice Speed",
    lowLabel: "Slow",
    highLabel: "Fast",
    description: "Controls how fast the assistant speaks.",
    min: 0.25,
    max: 4,
    step: 0.05,
  },
  {
    key: "voice_pitch",
    label: "Pitch",
    lowLabel: "Low",
    highLabel: "High",
    description: "Reserved for providers that support pitch control.",
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: "voice_stability",
    label: "Stability",
    lowLabel: "Dynamic",
    highLabel: "Stable",
    description: "Reserved for providers that support voice stability.",
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: "voice_clarity",
    label: "Clarity",
    lowLabel: "Soft",
    highLabel: "Sharp",
    description: "Controls the desired clarity instruction for generated speech.",
    min: 0,
    max: 100,
    step: 1,
  },
];

const voiceOptions = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
];

const voiceStyles = [
  "professional",
  "calm",
  "warm",
  "confident",
  "technical",
  "friendly",
  "executive",
];

const interactionModes: Array<{
  value: InteractionMode;
  label: string;
  description: string;
}> = [
  {
    value: "text",
    label: "Type Only",
    description: "Use chat text without voice playback.",
  },
  {
    value: "voice",
    label: "Voice Only",
    description: "Use microphone and spoken responses.",
  },
  {
    value: "avatar",
    label: "Avatar Only",
    description: "Use visual assistant animation without voice.",
  },
  {
    value: "voice-avatar",
    label: "Voice + Avatar",
    description: "Use speech input, spoken output, and animation.",
  },
  {
    value: "complete",
    label: "Complete Mode",
    description: "Use text, voice, and avatar together.",
  },
];

function createMessageId() {
  return crypto.randomUUID();
}

function resolveRouterLayer(provider?: string, debugLayer?: string) {
  if (debugLayer) return debugLayer;
  if (!provider) return undefined;

  if (provider.includes("approved")) return "approved";
  if (provider === "cache") return "exact-cache";
  if (provider === "semantic-cache") return "semantic-cache";
  if (provider.includes("guardrails")) return "guardrails";
  if (provider.includes("openai")) return "openai";
  if (provider.includes("controlled-refusal")) return "controlled-refusal";

  return provider;
}

function buildVoiceInstructions(settings: VoiceSettings) {
  const clarity =
    settings.voice_clarity >= 75
      ? "very clear and easy to understand"
      : settings.voice_clarity <= 35
        ? "soft and relaxed"
        : "clear and natural";

  return `Speak in a ${settings.voice_style} enterprise assistant voice. Keep the delivery ${clarity}.`;
}

function getAvatarStateLabel(state: AvatarState) {
  if (state === "offline") return "Offline";
  if (state === "listening") return "Listening";
  if (state === "thinking") return "Thinking";
  if (state === "speaking") return "Speaking";
  return "Ready";
}

function getModeUsesTts(mode: InteractionMode) {
  return mode === "voice" || mode === "voice-avatar" || mode === "complete";
}

function getModeUsesStt(mode: InteractionMode) {
  return mode === "voice" || mode === "voice-avatar" || mode === "complete";
}

function getModeUsesAvatar(mode: InteractionMode) {
  return mode === "avatar" || mode === "voice-avatar" || mode === "complete";
}

function formatPercent(value: boolean) {
  return value ? "ON" : "OFF";
}

export default function AIVoicePage() {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const [settings, setSettings] = useState<VoiceSettings>(defaultVoiceSettings);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("complete");
  const [avatarState, setAvatarState] = useState<AvatarState>("offline");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: createMessageId(),
      role: "assistant",
      content:
        "Voice session is ready. Open a session, then type or speak to test AiXia Assistant.",
    },
  ]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");

  const [sending, setSending] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const [lastTranscript, setLastTranscript] = useState("");
  const [lastAudioUrl, setLastAudioUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const modeUsesTts = getModeUsesTts(interactionMode);
  const modeUsesStt = getModeUsesStt(interactionMode);
  const modeUsesAvatar = getModeUsesAvatar(interactionMode);

  const activeVoiceStatus = settings.voice_enabled && sessionOpen;

  const voiceSummary = useMemo(() => {
    if (!settings.voice_enabled) return "Voice module is disabled.";
    if (!sessionOpen) return "Voice is configured. Open a session to use it.";

    return `Session active using ${settings.voice_provider} / ${settings.voice_name}. Mode: ${
      interactionModes.find((mode) => mode.value === interactionMode)?.label ??
      "Complete Mode"
    }.`;
  }, [
    interactionMode,
    sessionOpen,
    settings.voice_enabled,
    settings.voice_name,
    settings.voice_provider,
  ]);

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending, transcribing]);

  useEffect(() => {
    if (!sessionOpen) {
      setAvatarState("offline");
      return;
    }

    if (recording) {
      setAvatarState("listening");
      return;
    }

    if (sending || transcribing) {
      setAvatarState("thinking");
      return;
    }

    if (speaking) {
      setAvatarState("speaking");
      return;
    }

    setAvatarState("idle");
  }, [recording, sending, sessionOpen, speaking, transcribing]);

  async function loadSettings() {
    setLoadingSettings(true);
    setErrorMessage(null);
    setActionMessage(null);

    const { data, error } = await supabase
      .from("ai_settings")
      .select("setting_key, setting_value")
      .in("setting_key", voiceSettingKeys as string[]);

    if (error) {
      setErrorMessage(error.message);
      setLoadingSettings(false);
      return;
    }

    const nextSettings = { ...defaultVoiceSettings };

    for (const row of data ?? []) {
      const key = row.setting_key as keyof VoiceSettings;

      if (key in nextSettings) {
        const fallbackValue = nextSettings[key];
        const savedValue = row.setting_value?.value ?? fallbackValue;

        if (typeof fallbackValue === "boolean") {
          (nextSettings as Record<string, string | number | boolean>)[key] =
            Boolean(savedValue);
        } else if (typeof fallbackValue === "number") {
          (nextSettings as Record<string, string | number | boolean>)[key] =
            Number(savedValue);
        } else {
          (nextSettings as Record<string, string | number | boolean>)[key] =
            String(savedValue);
        }
      }
    }

    setSettings(nextSettings);
    setLoadingSettings(false);
  }

  async function saveSettings() {
    setSavingSettings(true);
    setErrorMessage(null);
    setActionMessage(null);

    for (const key of voiceSettingKeys) {
      const { error } = await supabase.rpc("ai_update_setting", {
        p_setting_key: key,
        p_setting_value: {
          value: settings[key],
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setSavingSettings(false);
        return;
      }
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "voice_settings_updated",
      entity_type: "ai_voice",
      entity_id: null,
      details: {
        voice_enabled: settings.voice_enabled,
        voice_tts_enabled: settings.voice_tts_enabled,
        voice_stt_enabled: settings.voice_stt_enabled,
        voice_provider: settings.voice_provider,
        voice_name: settings.voice_name,
        voice_style: settings.voice_style,
        voice_speed: settings.voice_speed,
      },
    });

    setActionMessage("Voice settings saved.");
    setSavingSettings(false);
  }

  function updateSetting(key: keyof VoiceSettings, value: string | number | boolean) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function openSession() {
    if (sessionOpen) return;

    setErrorMessage(null);
    setActionMessage(null);

    const { data, error } = await supabase
      .from("ai_conversation_sessions")
      .insert({
        title: "Voice Studio Session",
        source: "ai_voice_studio",
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const nextSessionId = data.id as string;

    setSessionId(nextSessionId);
    setSessionOpen(true);
    setAvatarState("idle");
    setMessages([
      {
        id: createMessageId(),
        role: "assistant",
        content:
          "Session opened. You can type, speak, play assistant voice, or test the avatar animation.",
      },
    ]);

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "voice_session_started",
      entity_type: "ai_voice",
      entity_id: nextSessionId,
      details: {
        interaction_mode: interactionMode,
        voice_name: settings.voice_name,
        voice_provider: settings.voice_provider,
      },
    });

    setActionMessage("Voice session opened.");
  }

  async function endSession() {
    if (!sessionOpen) return;

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (sessionId) {
      await supabase
        .from("ai_conversation_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      await supabase.from("ai_admin_activity_logs").insert({
        action_type: "voice_session_ended",
        entity_type: "ai_voice",
        entity_id: sessionId,
        details: {
          interaction_mode: interactionMode,
        },
      });
    }

    setSessionId(null);
    setSessionOpen(false);
    setAvatarState("offline");
    setRecording(false);
    setSpeaking(false);
    setSending(false);
    setTranscribing(false);
    setProvider("");
    setModel("");
    setActionMessage("Voice session ended.");
  }

  async function saveConversationMessage(message: Message) {
    if (!sessionId) return;

    const { error } = await supabase.from("ai_conversation_messages").insert({
      session_id: sessionId,
      role: message.role,
      content: message.content,
      provider: message.provider ?? null,
      model: message.model ?? null,
      router_layer: message.router_layer ?? null,
      router_reason: message.router_reason ?? null,
      matched_question: message.matched_question ?? null,
      similarity: message.similarity ?? null,
      feedback: null,
      metadata: {
        source: "ai_voice_studio",
        interaction_mode: interactionMode,
      },
    });

    if (error) {
      console.error("Voice conversation save error:", error);
    }
  }

  async function playText(text: string) {
    if (!settings.voice_enabled || !settings.voice_tts_enabled) {
      setErrorMessage("Text-to-speech is disabled.");
      return;
    }

    const cleanText = text.trim();

    if (!cleanText) return;

    setSpeaking(true);
    setErrorMessage(null);

    try {
      const result = await speakText({
        text: cleanText,
        model: settings.voice_tts_model,
        voice: settings.voice_name,
        instructions: buildVoiceInstructions(settings),
        response_format: "mp3",
        speed: settings.voice_speed,
      });

      const audioUrl = base64ToAudioUrl(result.audio_base64, result.mime_type);
      setLastAudioUrl(audioUrl);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setSpeaking(false);
      };

      audio.onerror = () => {
        setSpeaking(false);
        setErrorMessage("Audio playback failed.");
      };

      await audio.play();
    } catch (error) {
      setSpeaking(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Text-to-speech failed."
      );
    }
  }

  async function handleSend(messageText?: string) {
    const cleanInput = (messageText ?? input).trim();

    if (!cleanInput || sending) return;

    if (!sessionOpen) {
      setErrorMessage("Open a session before sending a message.");
      return;
    }

    const userMessage: Message = {
      id: createMessageId(),
      role: "user",
      content: cleanInput,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setErrorMessage(null);
    setProvider("");
    setModel("");

    await saveConversationMessage(userMessage);

    try {
      const result = await askAI(cleanInput);

      const assistantMessage: Message = {
        id: createMessageId(),
        role: "assistant",
        content: result.text || "No response received.",
        provider: result.provider || "",
        model: result.model || "",
        router_layer: resolveRouterLayer(result.provider, result.debug?.layer),
        router_reason: result.debug?.reason,
        matched_question: result.matched_question,
        similarity: result.similarity,
      };

      setMessages([...nextMessages, assistantMessage]);
      setProvider(result.provider || "");
      setModel(result.model || "");

      await saveConversationMessage(assistantMessage);

      if (modeUsesTts && settings.voice_enabled && settings.voice_tts_enabled) {
        await playText(assistantMessage.content);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: createMessageId(),
        role: "assistant",
        content: error instanceof Error ? error.message : "AI request failed.",
        provider: "client-error",
        model: "n/a",
        router_layer: "error",
        router_reason: "client_request_failed",
      };

      setMessages([...nextMessages, errorMessage]);
      await saveConversationMessage(errorMessage);
    } finally {
      setSending(false);
    }
  }

  async function startRecording() {
    if (!sessionOpen) {
      setErrorMessage("Open a session before recording.");
      return;
    }

    if (!settings.voice_enabled || !settings.voice_stt_enabled) {
      setErrorMessage("Speech-to-text is disabled.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Microphone recording is not supported in this browser.");
      return;
    }

    setErrorMessage(null);
    setActionMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void transcribeRecordedAudio(recorder.mimeType || "audio/webm");
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start recording."
      );
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  async function transcribeRecordedAudio(mimeType: string) {
    const audioBlob = new Blob(recordedChunksRef.current, {
      type: mimeType,
    });

    if (audioBlob.size === 0) {
      setErrorMessage("No audio was recorded.");
      return;
    }

    setTranscribing(true);
    setErrorMessage(null);

    try {
      const audioBase64 = await blobToBase64(audioBlob);

      const result = await transcribeAudio({
        audio_base64: audioBase64,
        mime_type: mimeType,
        filename: "voice-studio-recording.webm",
        model: settings.voice_stt_model,
      });

      setLastTranscript(result.text);

      if (result.text.trim()) {
        if (interactionMode === "voice" || interactionMode === "voice-avatar" || interactionMode === "complete") {
          await handleSend(result.text);
        } else {
          setInput(result.text);
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Speech-to-text failed."
      );
    } finally {
      setTranscribing(false);
    }
  }

  async function handleStandaloneSpeak() {
    const cleanInput = input.trim();

    if (!cleanInput) {
      setErrorMessage("Type text first before playing voice.");
      return;
    }

    await playText(cleanInput);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter") return;

    if (event.shiftKey) return;

    event.preventDefault();
    void handleSend();
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-6 py-6 text-white">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => navigate("/ai-management")}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
              >
                <ArrowLeft className="h-4 w-4" />
                AI Studio
              </button>

              <div className="space-y-3">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Radio className="h-3.5 w-3.5" />
                  Voice + Avatar Studio
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                    Voice Control
                  </h1>
                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                    Control speech-to-text, text-to-speech, animated avatar behavior,
                    and live test sessions for AiXia Assistant.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[760px]">
              <MetricCard
                label="Voice"
                value={formatPercent(settings.voice_enabled)}
                tone={settings.voice_enabled ? "emerald" : "rose"}
              />
              <MetricCard
                label="TTS"
                value={formatPercent(settings.voice_tts_enabled)}
                tone={settings.voice_tts_enabled ? "cyan" : "slate"}
              />
              <MetricCard
                label="STT"
                value={formatPercent(settings.voice_stt_enabled)}
                tone={settings.voice_stt_enabled ? "violet" : "slate"}
              />
              <MetricCard
                label="Session"
                value={sessionOpen ? "OPEN" : "CLOSED"}
                tone={sessionOpen ? "emerald" : "slate"}
              />
            </div>
          </div>
        </header>

        {(errorMessage || actionMessage) && (
          <div className="space-y-2">
            {errorMessage ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {errorMessage}
              </div>
            ) : null}

            {actionMessage ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {actionMessage}
              </div>
            ) : null}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.22),rgba(2,6,23,0.92)_46%,rgba(2,6,23,0.98))] shadow-2xl shadow-cyan-950/20">
              <div className="flex flex-col gap-6 border-b border-white/10 p-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                    Live Session
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    {voiceSummary}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void openSession()}
                    disabled={sessionOpen || loadingSettings}
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Open Session
                  </button>

                  <button
                    type="button"
                    onClick={() => void endSession()}
                    disabled={!sessionOpen}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:border-rose-300/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CircleStop className="h-4 w-4" />
                    End Session
                  </button>
                </div>
              </div>

              <div className="grid gap-0 lg:grid-cols-[420px_minmax(0,1fr)]">
                <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
                  <div className="relative mx-auto flex aspect-square max-w-[360px] items-center justify-center overflow-hidden rounded-[38px] border border-cyan-400/20 bg-black/30">
                    <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(34,211,238,0.18),transparent_58%)]" />
                    <div className="absolute inset-10 rounded-full border border-cyan-400/10" />
                    <div className="absolute inset-20 rounded-full border border-cyan-400/20" />

                    {modeUsesAvatar ? (
                      <>
                        <div
                          className={`absolute h-52 w-52 rounded-full blur-2xl transition-all duration-700 ${
                            avatarState === "speaking"
                              ? "bg-cyan-400/35 scale-110"
                              : avatarState === "listening"
                                ? "bg-violet-400/30 scale-105"
                                : avatarState === "thinking"
                                  ? "bg-amber-400/25 scale-100"
                                  : "bg-cyan-500/20 scale-95"
                          }`}
                        />

                        <div
                          className={`relative flex h-40 w-40 items-center justify-center rounded-full border bg-black/50 shadow-2xl transition-all duration-700 ${
                            avatarState === "speaking"
                              ? "border-cyan-300/70 shadow-cyan-400/30"
                              : avatarState === "listening"
                                ? "border-violet-300/60 shadow-violet-400/25"
                                : avatarState === "thinking"
                                  ? "border-amber-300/50 shadow-amber-400/20"
                                  : "border-cyan-400/30 shadow-cyan-500/10"
                          }`}
                        >
                          <div
                            className={`absolute inset-3 rounded-full border border-white/10 ${
                              activeVoiceStatus ? "animate-pulse" : ""
                            }`}
                          />
                          <Bot className="h-16 w-16 text-cyan-100" />
                        </div>

                        <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-xl">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                Avatar State
                              </div>
                              <div className="mt-1 text-sm font-semibold text-white">
                                {getAvatarStateLabel(avatarState)}
                              </div>
                            </div>

                            <div
                              className={`h-3 w-3 rounded-full ${
                                sessionOpen ? "bg-emerald-400" : "bg-rose-400"
                              }`}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="relative rounded-[30px] border border-white/10 bg-white/[0.04] p-8 text-center">
                        <Bot className="mx-auto h-14 w-14 text-slate-500" />
                        <div className="mt-4 text-sm font-semibold text-white">
                          Avatar Disabled In This Mode
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Select Avatar, Voice + Avatar, or Complete Mode.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex min-h-[620px] flex-col">
                  <div className="grid gap-3 border-b border-white/10 p-5 md:grid-cols-5">
                    {interactionModes.map((mode) => {
                      const active = interactionMode === mode.value;

                      return (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => setInteractionMode(mode.value)}
                          className={`rounded-2xl border px-3 py-3 text-left transition ${
                            active
                              ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                              : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          <div className="text-xs font-semibold">
                            {mode.label}
                          </div>
                          <div className="mt-1 line-clamp-2 text-[11px] leading-4 opacity-70">
                            {mode.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div
                    ref={chatScrollRef}
                    className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5"
                  >
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[86%] rounded-[24px] px-4 py-3 text-sm leading-6 ${
                            message.role === "user"
                              ? "bg-cyan-500 text-slate-950"
                              : "border border-white/10 bg-white/[0.055] text-white/85"
                          }`}
                        >
                          {message.content}

                          {message.role === "assistant" && message.provider ? (
                            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/45">
                              {message.provider}
                              {message.model ? ` · ${message.model}` : ""}
                              {message.router_layer
                                ? ` · ${message.router_layer}`
                                : ""}
                            </div>
                          ) : null}

                          {message.role === "assistant" &&
                          message.content &&
                          settings.voice_tts_enabled ? (
                            <button
                              type="button"
                              onClick={() => void playText(message.content)}
                              className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 transition hover:border-cyan-300/50"
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                              Play Voice
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}

                    {(sending || transcribing) && (
                      <div className="flex justify-start">
                        <div className="rounded-[24px] border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white/60">
                          {transcribing ? "Transcribing voice..." : "Thinking..."}
                        </div>
                      </div>
                    )}
                  </div>

                                    <div className="border-t border-white/10 p-5">
                    {(provider || model || lastTranscript) && (
                      <div className="mb-4 grid gap-3 md:grid-cols-3">
                        <StatusPill
                          label="Provider"
                          value={provider || "-"}
                          tone="cyan"
                        />
                        <StatusPill
                          label="Model"
                          value={model || "-"}
                          tone="violet"
                        />
                        <StatusPill
                          label="Transcript"
                          value={lastTranscript || "-"}
                          tone="emerald"
                        />
                      </div>
                    )}

                    <div className="rounded-[26px] border border-white/10 bg-black/25 p-3">
                      <textarea
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Type your message... Enter sends, Shift + Enter adds a new line."
                        className="min-h-[96px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
                      />

                      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={
                              recording
                                ? stopRecording
                                : () => void startRecording()
                            }
                            disabled={
                              !sessionOpen ||
                              !settings.voice_enabled ||
                              !settings.voice_stt_enabled ||
                              !modeUsesStt ||
                              transcribing
                            }
                            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              recording
                                ? "border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                                : "border-violet-400/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
                            }`}
                          >
                            {recording ? (
                              <>
                                <MicOff className="h-4 w-4" />
                                Stop Recording
                              </>
                            ) : (
                              <>
                                <Mic className="h-4 w-4" />
                                Speak
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleStandaloneSpeak()}
                            disabled={
                              !sessionOpen ||
                              !settings.voice_enabled ||
                              !settings.voice_tts_enabled ||
                              !input.trim() ||
                              speaking
                            }
                            className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Play className="h-4 w-4" />
                            Text to Voice
                          </button>

                          {lastAudioUrl ? (
                            <audio
                              controls
                              src={lastAudioUrl}
                              className="h-10 max-w-[240px]"
                            />
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleSend()}
                          disabled={!sessionOpen || sending || !input.trim()}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                          {sending ? "Sending..." : "Send"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <Panel
              eyebrow="Runtime Controls"
              title="Voice Engine"
              description="Enable voice features and choose how the assistant speaks and listens."
              action={
                <button
                  type="button"
                  onClick={() => void loadSettings()}
                  disabled={loadingSettings}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${loadingSettings ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              }
            >
              <div className="grid gap-3">
                <ToggleRow
                  icon={Radio}
                  label="Voice Module"
                  description="Main switch for all voice and avatar runtime testing."
                  checked={settings.voice_enabled}
                  onChange={(value) => updateSetting("voice_enabled", value)}
                />

                <ToggleRow
                  icon={Volume2}
                  label="Text to Voice"
                  description="Allow the assistant to generate spoken audio."
                  checked={settings.voice_tts_enabled}
                  onChange={(value) => updateSetting("voice_tts_enabled", value)}
                />

                <ToggleRow
                  icon={Mic}
                  label="Voice to Text"
                  description="Allow microphone input and transcription."
                  checked={settings.voice_stt_enabled}
                  onChange={(value) => updateSetting("voice_stt_enabled", value)}
                />
              </div>
            </Panel>

            <Panel
              eyebrow="Voice Identity"
              title="Provider + Voice"
              description="Choose provider, models, speaking style, and voice identity."
            >
              <div className="grid gap-4">
                <SelectField
                  label="Provider"
                  value={settings.voice_provider}
                  options={[
                    { value: "openai", label: "OpenAI" },
                    { value: "future-provider", label: "Future Provider" },
                  ]}
                  onChange={(value) => updateSetting("voice_provider", value)}
                />

                <SelectField
                  label="Voice"
                  value={settings.voice_name}
                  options={voiceOptions.map((voice) => ({
                    value: voice,
                    label: voice,
                  }))}
                  onChange={(value) => updateSetting("voice_name", value)}
                />

                <SelectField
                  label="Style"
                  value={settings.voice_style}
                  options={voiceStyles.map((style) => ({
                    value: style,
                    label: style,
                  }))}
                  onChange={(value) => updateSetting("voice_style", value)}
                />

                <TextField
                  label="TTS Model"
                  value={settings.voice_tts_model}
                  onChange={(value) => updateSetting("voice_tts_model", value)}
                />

                <TextField
                  label="STT Model"
                  value={settings.voice_stt_model}
                  onChange={(value) => updateSetting("voice_stt_model", value)}
                />
              </div>
            </Panel>

            <Panel
              eyebrow="Voice Tuning"
              title="Speech Controls"
              description="Fine tune voice behavior. Some controls are provider-ready for future expansion."
            >
              <div className="grid gap-4">
                {voiceSliders.map((slider) => {
                  const value = Number(settings[slider.key]);

                  return (
                    <div
                      key={slider.key}
                      className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {slider.label}
                          </div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">
                            {slider.description}
                          </div>
                        </div>

                        <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                          {value}
                        </div>
                      </div>

                      <input
                        type="range"
                        min={slider.min}
                        max={slider.max}
                        step={slider.step}
                        value={value}
                        onChange={(event) =>
                          updateSetting(slider.key, Number(event.target.value))
                        }
                        className="mt-4 w-full accent-cyan-400"
                      />

                      <div className="mt-2 flex justify-between text-xs text-slate-500">
                        <span>{slider.lowLabel}</span>
                        <span>{slider.highLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel
              eyebrow="Admin Notes"
              title="Voice Notes"
              description="Optional internal notes for voice behavior and future provider setup."
            >
              <div className="grid gap-4">
                <textarea
                  value={settings.voice_notes}
                  onChange={(event) =>
                    updateSetting("voice_notes", event.target.value)
                  }
                  rows={5}
                  placeholder="Example: Use a calm professional voice for investor demos..."
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
                />

                <button
                  type="button"
                  onClick={() => void saveSettings()}
                  disabled={savingSettings || loadingSettings}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {savingSettings ? "Saving..." : "Save Voice Settings"}
                </button>
              </div>
            </Panel>
          </aside>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "rose" | "cyan" | "violet" | "slate";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-200"
      : tone === "rose"
        ? "text-rose-200"
        : tone === "violet"
          ? "text-violet-200"
          : tone === "cyan"
            ? "text-cyan-200"
            : "text-slate-300";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "cyan" | "violet" | "emerald";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
      : tone === "violet"
        ? "border-violet-400/20 bg-violet-500/10 text-violet-200"
        : "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">
        {label}
      </div>
      <div className="mt-1 truncate text-xs font-semibold">{value}</div>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
            {eyebrow}
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="p-5">{children}</div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: typeof Radio;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition ${
        checked
          ? "border-cyan-400/30 bg-cyan-500/10"
          : "border-white/10 bg-black/20 hover:border-white/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`rounded-2xl border p-3 ${
            checked
              ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
              : "border-white/10 bg-white/[0.04] text-slate-500"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div>
          <div className="text-sm font-semibold text-white">{label}</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {checked ? (
        <ToggleRight className="h-5 w-5 shrink-0 text-cyan-200" />
      ) : (
        <ToggleLeft className="h-5 w-5 shrink-0 text-slate-500" />
      )}
    </button>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
      />
    </label>
  );
}
