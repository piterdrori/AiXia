import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  CircleStop,
  Mic,
  Radio,
  RefreshCcw,
  Save,
  Send,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { askAI } from "@/lib/ai/aiRouter";
import {
  connectRealtimeVoice,
  createRealtimeVoiceSession,
  type RealtimeConnection,
} from "@/lib/ai/realtimeVoice";

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

type AvatarState =
  | "offline"
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "paused";

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
  voice_tts_model: "tts-1",
  voice_name: "alloy",
  voice_style: "professional",
  voice_speed: 1.35,
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

function getAvatarStateLabel(state: AvatarState) {
  if (state === "offline") return "Offline";
  if (state === "idle") return "Idle";
  if (state === "listening") return "Listening";
  if (state === "thinking") return "Thinking";
  if (state === "speaking") return "Speaking";
  if (state === "paused") return "Paused";
  return "Idle";
}
function formatPercent(value: boolean) {
  return value ? "ON" : "OFF";
}

export default function AIVoicePage() {
  const navigate = useNavigate();
  const realtimeConnectionRef = useRef<RealtimeConnection | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const [settings, setSettings] = useState<VoiceSettings>(defaultVoiceSettings);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const interactionMode = "complete";
  const [avatarState, setAvatarState] = useState<AvatarState>("offline");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: createMessageId(),
      role: "assistant",
      content:
        "Voice Testing Studio is ready. Start Conversation to test realtime voice, or use the text box for typed testing.",
    },
  ]);

  const [input, setInput] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");

  const [sending, setSending] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [realtimeOpen, setRealtimeOpen] = useState(false);
  const [realtimeConnecting, setRealtimeConnecting] = useState(false);
  const [realtimeEvents, setRealtimeEvents] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const activeVoiceStatus = settings.voice_enabled && sessionOpen;

    const voiceSummary = useMemo(() => {
    if (!settings.voice_enabled) return "Realtime voice is disabled.";
    if (!sessionOpen) return "Realtime voice is ready. Start a conversation to test it.";

    return `Realtime conversation active using ${settings.voice_provider} / ${settings.voice_name}.`;
  }, [
    sessionOpen,
    settings.voice_enabled,
    settings.voice_name,
    settings.voice_provider,
  ]);

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    return () => {
      if (realtimeConnectionRef.current) {
        realtimeConnectionRef.current.close();
        realtimeConnectionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

     useEffect(() => {
    if (!sessionOpen) {
      setAvatarState("offline");
      return;
    }

    if (sending) {
      setAvatarState("thinking");
      return;
    }

    if (!realtimeOpen) {
      setAvatarState("idle");
    }
  }, [realtimeOpen, sending, sessionOpen]);

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

    setActionMessage("Realtime settings saved.");
    setSavingSettings(false);
  }

       function updateSetting(key: keyof VoiceSettings, value: string | number | boolean) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

   function closeRealtimeConnection() {
    if (realtimeConnectionRef.current) {
      realtimeConnectionRef.current.close();
      realtimeConnectionRef.current = null;
    }

    setRealtimeOpen(false);
    setRealtimeConnecting(false);
  }

  function setRealtimeMicrophoneEnabled(enabled: boolean) {
    const localStream = realtimeConnectionRef.current?.localStream;

    if (!localStream) return;

    localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  function handleRealtimeEvent(event: MessageEvent) {
    const rawMessage = String(event.data ?? "");

    if (!rawMessage) return;

    try {
      const parsed = JSON.parse(rawMessage) as {
        type?: string;
        transcript?: string;
        delta?: string;
        item?: {
          role?: string;
          content?: Array<{
            type?: string;
            transcript?: string;
            text?: string;
          }>;
        };
      };

      const eventType = parsed.type ?? "realtime.event";

      if (
        eventType === "input_audio_buffer.speech_started" ||
        eventType === "input_audio_buffer.speech_stopped" ||
        eventType === "response.created" ||
        eventType === "response.audio.delta" ||
        eventType === "response.audio.done" ||
        eventType === "response.done"
      ) {
        setRealtimeEvents((current) => [eventType, ...current].slice(0, 8));
      }

      if (eventType === "input_audio_buffer.speech_started") {
        setRealtimeMicrophoneEnabled(true);
        setAvatarState("listening");
      }

      if (eventType === "input_audio_buffer.speech_stopped") {
        setAvatarState("thinking");
      }

      if (eventType === "response.created") {
        setRealtimeMicrophoneEnabled(false);
        setAvatarState("thinking");
      }

      if (eventType === "response.audio.delta") {
        setRealtimeMicrophoneEnabled(false);
        setAvatarState("speaking");
      }

      if (
        eventType === "response.audio.done" ||
        eventType === "response.done"
      ) {
        setRealtimeMicrophoneEnabled(true);
        setAvatarState("idle");
      }

      const transcript =
        parsed.transcript ??
        parsed.delta ??
        parsed.item?.content?.find((contentItem) => contentItem.transcript)
          ?.transcript ??
        parsed.item?.content?.find((contentItem) => contentItem.text)?.text ??
        "";

      if (transcript.trim()) {
        setLastTranscript(transcript.trim());
      }
    } catch {
      setRealtimeEvents((current) =>
        [rawMessage.slice(0, 80), ...current].slice(0, 8)
      );
    }
  }

  function buildRealtimeInstructions() {
    return [
      "You are AiXia Assistant.",
      "Reply immediately, clearly, and briefly.",
      "Use short practical answers unless the user asks for detail.",
      "You are inside the AiXia enterprise system.",
      "Help with workflows, projects, tasks, finance, operations, and internal work.",
      "Do not over-explain.",
      settings.voice_notes ? `Admin voice notes: ${settings.voice_notes}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  async function startRealtimeSession() {
    if (realtimeOpen || realtimeConnecting) return;

    if (!settings.voice_enabled) {
      setErrorMessage("Realtime Voice is disabled.");
      return;
    }

    if (!settings.voice_stt_enabled || !settings.voice_tts_enabled) {
      setErrorMessage("Realtime Voice must be enabled before starting a conversation.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Microphone access is not supported in this browser.");
      return;
    }

    setRealtimeConnecting(true);
    setErrorMessage(null);
    setActionMessage(null);
    setRealtimeEvents([]);

    try {
      if (!sessionOpen) {
        await openSession();
      }

      const realtimeSession = await createRealtimeVoiceSession({
        model: "gpt-realtime-mini",
        voice: "marin",
        instructions: buildRealtimeInstructions(),
      });

      const connection = await connectRealtimeVoice({
        clientSecret: realtimeSession.client_secret,
        model: realtimeSession.model,
        onDataMessage: handleRealtimeEvent,
      });

      realtimeConnectionRef.current = connection;
      setRealtimeMicrophoneEnabled(true);
      setRealtimeOpen(true);
      setRealtimeConnecting(false);
      setAvatarState("idle");
      setProvider("openai-realtime");
      setModel(realtimeSession.model);

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content:
            "Realtime voice is connected. Speak naturally and AiXia will reply by voice.",
          provider: "openai-realtime",
          model: realtimeSession.model,
          router_layer: "realtime",
        },
      ]);

      setActionMessage("Realtime conversation started.");
    } catch (error) {
      closeRealtimeConnection();
      setAvatarState(sessionOpen ? "idle" : "offline");
      setErrorMessage(
        error instanceof Error ? error.message : "Realtime session failed."
      );
    }
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
          "Realtime conversation is open. Speak naturally, or type a test message in the text box.",
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

    setActionMessage("Realtime conversation opened.");
  }

  async function endSession() {
    if (!sessionOpen) return;

    closeRealtimeConnection();

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
    setSending(false);
    setProvider("");
    setModel("");
    setActionMessage("Realtime conversation ended.");
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

  async function handleSend(messageText?: string) {
    const cleanInput = (messageText ?? input).trim();

    if (!cleanInput || sending) return;

    if (!sessionOpen) {
      setErrorMessage("Start a conversation before sending a typed test message.");
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
                  Realtime Voice Testing
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                    Voice Testing Studio
                  </h1>
                                   <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                    Test realtime conversation, avatar animation states, typed
                    messages, connection status, debug events, and voice settings
                    for AiXia Assistant.
                  </p>
                </div>
              </div>
            </div>

                        <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[760px]">
              <MetricCard
                label="Realtime"
                value={formatPercent(settings.voice_enabled)}
                tone={settings.voice_enabled ? "emerald" : "rose"}
              />
              <MetricCard
                label="Connection"
                value={realtimeOpen ? "LIVE" : "OFF"}
                tone={realtimeOpen ? "emerald" : "slate"}
              />
              <MetricCard
                label="Avatar"
                value={getAvatarStateLabel(avatarState)}
                tone={
                  avatarState === "speaking"
                    ? "cyan"
                    : avatarState === "listening"
                      ? "violet"
                      : avatarState === "thinking"
                        ? "rose"
                        : sessionOpen
                          ? "emerald"
                          : "slate"
                }
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

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.20),rgba(2,6,23,0.94)_42%,rgba(2,6,23,0.99))] shadow-2xl shadow-cyan-950/20">
            <div className="flex flex-col gap-5 border-b border-white/10 p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  Realtime Test Session
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  {voiceSummary}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  One focused testing workspace for realtime voice, avatar state,
                  typed messages, transcript visibility, and debug events.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void startRealtimeSession()}
                  disabled={
                    realtimeOpen ||
                    realtimeConnecting ||
                    !settings.voice_enabled ||
                    loadingSettings
                  }
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-5 py-3 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Mic className="h-4 w-4" />
                  {realtimeConnecting ? "Connecting..." : "Start Conversation"}
                </button>

                <button
                  type="button"
                  onClick={() => void endSession()}
                  disabled={!sessionOpen && !realtimeOpen}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:border-rose-300/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CircleStop className="h-4 w-4" />
                  End Conversation
                </button>
              </div>
            </div>

            <div className="grid min-h-[720px] gap-0 2xl:grid-cols-[460px_minmax(0,1fr)]">
              <div className="border-b border-white/10 bg-black/10 p-6 2xl:border-b-0 2xl:border-r">
                <div className="relative flex min-h-[640px] flex-col overflow-hidden rounded-[34px] border border-cyan-400/20 bg-black/30">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(34,211,238,0.24),transparent_45%),radial-gradient(circle_at_50%_72%,rgba(139,92,246,0.16),transparent_46%)]" />
                  <div className="absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full border border-cyan-400/10" />
                  <div className="absolute left-1/2 top-28 h-52 w-52 -translate-x-1/2 rounded-full border border-cyan-400/20" />

                  <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                    <div
                      className={`absolute h-64 w-64 rounded-full blur-3xl transition-all duration-700 ${
                        avatarState === "speaking"
                          ? "scale-110 bg-cyan-400/35"
                          : avatarState === "listening"
                            ? "scale-105 bg-violet-400/30"
                            : avatarState === "thinking"
                              ? "scale-100 bg-amber-400/25"
                              : sessionOpen
                                ? "scale-95 bg-cyan-500/20"
                                : "scale-90 bg-slate-500/10"
                      }`}
                    />

                    <div
                      className={`relative flex h-48 w-48 items-center justify-center rounded-full border bg-black/55 shadow-2xl transition-all duration-700 ${
                        avatarState === "speaking"
                          ? "border-cyan-300/70 shadow-cyan-400/30"
                          : avatarState === "listening"
                            ? "border-violet-300/60 shadow-violet-400/25"
                            : avatarState === "thinking"
                              ? "border-amber-300/50 shadow-amber-400/20"
                              : sessionOpen
                                ? "border-cyan-400/35 shadow-cyan-500/10"
                                : "border-white/10 shadow-black/20"
                      }`}
                    >
                      <div
                        className={`absolute inset-4 rounded-full border border-white/10 ${
                          activeVoiceStatus ? "animate-pulse" : ""
                        }`}
                      />
                      <Bot className="h-20 w-20 text-cyan-100" />
                    </div>

                                        <div className="mt-8 inline-flex rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Avatar Active
                    </div>

                    <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                      {getAvatarStateLabel(avatarState)}
                    </h3>
                    <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
                      The avatar reflects the realtime test state: ready,
                      listening, thinking, or speaking.
                    </p>
                  </div>

                  <div className="relative border-t border-white/10 bg-black/25 p-5">
                    <div className="grid grid-cols-2 gap-3">
                      <StatusPill
                        label="Connection"
                        value={realtimeOpen ? "LIVE" : "OFF"}
                        tone={realtimeOpen ? "emerald" : "cyan"}
                      />
                      <StatusPill
                        label="Session"
                        value={sessionOpen ? "OPEN" : "CLOSED"}
                        tone={sessionOpen ? "emerald" : "cyan"}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex min-h-[720px] flex-col">
                <div className="border-b border-white/10 p-5">
                  <div className="grid gap-3 lg:grid-cols-4">
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
                      label="Last Transcript"
                      value={lastTranscript || "-"}
                      tone="emerald"
                    />
                    <StatusPill
                      label="Realtime Status"
                      value={realtimeOpen ? "ON" : "OFF"}
                      tone={realtimeOpen ? "emerald" : "cyan"}
                    />
                  </div>
                </div>

                <div
                  ref={chatScrollRef}
                  className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5"
                >
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
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
                      </div>
                    </div>
                  ))}

                                    {sending && (
                    <div className="flex justify-start">
                      <div className="rounded-[24px] border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white/60">
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 p-5">
                  <div className="rounded-[26px] border border-white/10 bg-black/25 p-3">
                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder="Type a test message... Enter sends, Shift + Enter adds a new line."
                      className="min-h-[104px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
                    />

                    <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <p className="text-xs leading-5 text-slate-500">
                        Typed testing stays available here. Realtime voice is
                        controlled only by Start Conversation / End Conversation.
                      </p>

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

          <aside className="flex flex-col gap-6">
            <Panel
              eyebrow="Runtime Controls"
              title="Realtime Engine"
              description="Enable the realtime test conversation for microphone input, voice output, and avatar state testing."
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
                  label="Realtime Voice"
                  description="Main switch for the realtime test conversation. Microphone input and voice output are controlled together."
                  checked={settings.voice_enabled}
                  onChange={(value) => {
                    updateSetting("voice_enabled", value);
                    updateSetting("voice_tts_enabled", value);
                    updateSetting("voice_stt_enabled", value);
                  }}
                />
              </div>
            </Panel>

            <Panel
              eyebrow="Realtime Identity"
              title="Provider + Voice"
              description="Choose the realtime provider, voice identity, and speaking style for test conversations."
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
                  label="Realtime Voice Model"
                  value={settings.voice_tts_model}
                  onChange={(value) => updateSetting("voice_tts_model", value)}
                />

                <TextField
                  label="Realtime Transcription Model"
                  value={settings.voice_stt_model}
                  onChange={(value) => updateSetting("voice_stt_model", value)}
                />
              </div>
            </Panel>

            <Panel
              eyebrow="Knowledge + Router"
              title="Answer Source"
              description="Shows whether typed test answers are coming from cache, approved answers, knowledge, or model fallback."
            >
              <div className="grid gap-3">
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
                  label="Last Transcript"
                  value={lastTranscript || "-"}
                  tone="emerald"
                />
              </div>
            </Panel>

            <Panel
              eyebrow="Debug"
              title="Realtime Events"
              description="Live event trail from the realtime connection."
            >
              {realtimeEvents.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {realtimeEvents.map((eventName, eventIndex) => (
                    <span
                      key={`${eventName}-${eventIndex}`}
                      className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-slate-300"
                    >
                      {eventName}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-500">
                  Debug events will appear after Start Conversation connects.
                </div>
              )}
            </Panel>

            <Panel
              eyebrow="Realtime Tuning"
              title="Speech Controls"
              description="Fine tune realtime voice speed, clarity, and provider-ready voice behavior."
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
              eyebrow="Realtime Notes"
              title="Conversation Notes"
              description="Optional internal notes that are injected into realtime test conversation instructions."
            >
              <div className="grid gap-4">
                <textarea
                  value={settings.voice_notes}
                  onChange={(event) =>
                    updateSetting("voice_notes", event.target.value)
                  }
                  rows={5}
                  placeholder="Example: Keep realtime replies short, direct, and suitable for dashboard testing..."
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
                />

                <button
                  type="button"
                  onClick={() => void saveSettings()}
                  disabled={savingSettings || loadingSettings}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {savingSettings ? "Saving..." : "Save Realtime Settings"}
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
