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
  Timer,
  ToggleLeft,
  ToggleRight,
  Zap,
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
  realtime_vad_threshold: number;
  realtime_prefix_padding_ms: number;
  realtime_silence_duration_ms: number;
  realtime_idle_timeout_ms: number;
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

type DebugEvent = {
  id: string;
  type: string;
  time: string;
  detail?: string;
};

type LatencyMetrics = {
  speechStartedAt: number | null;
  speechStoppedAt: number | null;
  transcriptCompletedAt: number | null;
  routerStartedAt: number | null;
  routerCompletedAt: number | null;
  responseCreatedAt: number | null;
  firstAudioDeltaAt: number | null;
  audioDoneAt: number | null;
  speechStoppedToTranscriptMs: number | null;
  transcriptToRouterMs: number | null;
  routerTotalMs: number | null;
  routerToResponseCreatedMs: number | null;
  responseCreatedToFirstAudioMs: number | null;
  speechStoppedToFirstAudioMs: number | null;
  totalTurnMs: number | null;
};

const emptyLatencyMetrics: LatencyMetrics = {
  speechStartedAt: null,
  speechStoppedAt: null,
  transcriptCompletedAt: null,
  routerStartedAt: null,
  routerCompletedAt: null,
  responseCreatedAt: null,
  firstAudioDeltaAt: null,
  audioDoneAt: null,
  speechStoppedToTranscriptMs: null,
  transcriptToRouterMs: null,
  routerTotalMs: null,
  routerToResponseCreatedMs: null,
  responseCreatedToFirstAudioMs: null,
  speechStoppedToFirstAudioMs: null,
  totalTurnMs: null,
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
  realtime_vad_threshold: 0.58,
  realtime_prefix_padding_ms: 250,
  realtime_silence_duration_ms: 650,
  realtime_idle_timeout_ms: 0,
};

const voiceSettingKeys = Object.keys(defaultVoiceSettings) as Array<
  keyof VoiceSettings
>;

const voiceOptions = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "marin",
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

const vadSliders: VoiceSlider[] = [
  {
    key: "realtime_vad_threshold",
    label: "Speech Detection Threshold",
    lowLabel: "Sensitive",
    highLabel: "Strict",
    description:
      "Lower hears softer speech faster. Higher ignores more background noise.",
    min: 0.1,
    max: 1,
    step: 0.01,
  },
  {
    key: "realtime_prefix_padding_ms",
    label: "Prefix Padding",
    lowLabel: "Tight",
    highLabel: "Buffered",
    description:
      "Keeps a little audio before speech starts so first words are not cut.",
    min: 0,
    max: 2000,
    step: 25,
  },
  {
    key: "realtime_silence_duration_ms",
    label: "Silence Before Submit",
    lowLabel: "Fast",
    highLabel: "Patient",
    description:
      "How long silence must last before the system treats the turn as finished.",
    min: 200,
    max: 3000,
    step: 25,
  },
  {
    key: "realtime_idle_timeout_ms",
    label: "Idle Timeout",
    lowLabel: "Off",
    highLabel: "Long",
    description:
      "Optional timeout for idle sessions. Zero means disabled.",
    min: 0,
    max: 30000,
    step: 500,
  },
];

function createMessageId() {
  return crypto.randomUUID();
}

function createDebugId() {
  return crypto.randomUUID();
}

function nowLabel() {
  return new Date().toLocaleTimeString();
}

function formatPercent(value: boolean) {
  return value ? "ON" : "OFF";
}

function formatMs(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";

  if (value < 1000) return `${Math.round(value)}ms`;

  return `${(value / 1000).toFixed(2)}s`;
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

function getMetricTone(value: number | null, good: number, ok: number) {
  if (value === null) return "slate";
  if (value <= good) return "emerald";
  if (value <= ok) return "cyan";
  return "rose";
}

export default function AIVoicePage() {
  const navigate = useNavigate();
  const realtimeConnectionRef = useRef<RealtimeConnection | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const userTranscriptDraftsRef = useRef<Record<string, string>>({});
  const assistantTranscriptDraftsRef = useRef<Record<string, string>>({});
  const routedRealtimeQuestionsRef = useRef<Set<string>>(new Set());
  const speakingSafetyTimerRef = useRef<number | null>(null);
  const firstAudioDeltaCapturedRef = useRef(false);
  const latencyRef = useRef<LatencyMetrics>(emptyLatencyMetrics);

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
  const [lastAiReply, setLastAiReply] = useState("");
  const [realtimeOpen, setRealtimeOpen] = useState(false);
  const [realtimeConnecting, setRealtimeConnecting] = useState(false);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const [latencyMetrics, setLatencyMetrics] =
    useState<LatencyMetrics>(emptyLatencyMetrics);
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

  const micStatus = useMemo(() => {
    const stream = realtimeConnectionRef.current?.localStream;
    const audioTrack = stream?.getAudioTracks()[0];

    if (!stream || !audioTrack) return "Unavailable";

    return audioTrack.enabled ? "ON" : "MUTED";
  }, [avatarState, realtimeOpen]);

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    return () => {
      if (speakingSafetyTimerRef.current) {
        window.clearTimeout(speakingSafetyTimerRef.current);
        speakingSafetyTimerRef.current = null;
      }

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

  function pushDebugEvent(type: string, detail?: string) {
    setDebugEvents((current) =>
      [
        {
          id: createDebugId(),
          type,
          time: nowLabel(),
          detail,
        },
        ...current,
      ].slice(0, 80)
    );
  }

  function updateLatency(next: Partial<LatencyMetrics>) {
    const merged: LatencyMetrics = {
      ...latencyRef.current,
      ...next,
    };

    const computed: LatencyMetrics = {
      ...merged,
      speechStoppedToTranscriptMs:
        merged.speechStoppedAt && merged.transcriptCompletedAt
          ? merged.transcriptCompletedAt - merged.speechStoppedAt
          : merged.speechStoppedToTranscriptMs,
      transcriptToRouterMs:
        merged.transcriptCompletedAt && merged.routerStartedAt
          ? merged.routerStartedAt - merged.transcriptCompletedAt
          : merged.transcriptToRouterMs,
      routerTotalMs:
        merged.routerStartedAt && merged.routerCompletedAt
          ? merged.routerCompletedAt - merged.routerStartedAt
          : merged.routerTotalMs,
      routerToResponseCreatedMs:
        merged.routerCompletedAt && merged.responseCreatedAt
          ? merged.responseCreatedAt - merged.routerCompletedAt
          : merged.routerToResponseCreatedMs,
      responseCreatedToFirstAudioMs:
        merged.responseCreatedAt && merged.firstAudioDeltaAt
          ? merged.firstAudioDeltaAt - merged.responseCreatedAt
          : merged.responseCreatedToFirstAudioMs,
      speechStoppedToFirstAudioMs:
        merged.speechStoppedAt && merged.firstAudioDeltaAt
          ? merged.firstAudioDeltaAt - merged.speechStoppedAt
          : merged.speechStoppedToFirstAudioMs,
      totalTurnMs:
        merged.speechStartedAt && merged.audioDoneAt
          ? merged.audioDoneAt - merged.speechStartedAt
          : merged.totalTurnMs,
    };

    latencyRef.current = computed;
    setLatencyMetrics(computed);
  }

  function resetLatencyTurn() {
    firstAudioDeltaCapturedRef.current = false;
    latencyRef.current = emptyLatencyMetrics;
    setLatencyMetrics(emptyLatencyMetrics);
  }

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
        realtime_vad_threshold: settings.realtime_vad_threshold,
        realtime_prefix_padding_ms: settings.realtime_prefix_padding_ms,
        realtime_silence_duration_ms: settings.realtime_silence_duration_ms,
        realtime_idle_timeout_ms: settings.realtime_idle_timeout_ms,
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
    if (speakingSafetyTimerRef.current) {
      window.clearTimeout(speakingSafetyTimerRef.current);
      speakingSafetyTimerRef.current = null;
    }

    if (realtimeConnectionRef.current) {
      realtimeConnectionRef.current.close();
      realtimeConnectionRef.current = null;
    }

    userTranscriptDraftsRef.current = {};
    assistantTranscriptDraftsRef.current = {};
    routedRealtimeQuestionsRef.current.clear();
    setRealtimeOpen(false);
    setRealtimeConnecting(false);
  }

  function upsertRealtimeMessage({
    id,
    role,
    content,
    provider: messageProvider,
    model: messageModel,
    routerLayer,
  }: {
    id: string;
    role: "user" | "assistant";
    content: string;
    provider?: string;
    model?: string;
    routerLayer?: string;
  }) {
    const cleanContent = content.trim();

    if (!cleanContent) return;

    setMessages((current) => {
      const existingIndex = current.findIndex((message) => message.id === id);

      if (existingIndex >= 0) {
        return current.map((message, index) =>
          index === existingIndex
            ? {
                ...message,
                content: cleanContent,
                provider: messageProvider ?? message.provider,
                model: messageModel ?? message.model,
                router_layer: routerLayer ?? message.router_layer,
              }
            : message
        );
      }

      return [
        ...current,
        {
          id,
          role,
          content: cleanContent,
          provider: messageProvider,
          model: messageModel,
          router_layer: routerLayer,
        },
      ];
    });
  }

  function setRealtimeMicrophoneEnabled(enabled: boolean) {
    const localStream = realtimeConnectionRef.current?.localStream;

    if (!localStream) return;

    localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  function speakRouterAnswerWithRealtime(answer: string) {
    const cleanAnswer = answer.trim();
    const dataChannel = realtimeConnectionRef.current?.dataChannel;

    if (speakingSafetyTimerRef.current) {
      window.clearTimeout(speakingSafetyTimerRef.current);
      speakingSafetyTimerRef.current = null;
    }

    if (!cleanAnswer) {
      setRealtimeMicrophoneEnabled(true);
      setAvatarState("idle");
      return;
    }

    if (!dataChannel || dataChannel.readyState !== "open") {
      setErrorMessage(
        "Realtime speaker is not connected. The router answer is shown as text, but voice playback could not start."
      );
      pushDebugEvent("speaker.not_connected");
      setRealtimeMicrophoneEnabled(true);
      setAvatarState("idle");
      return;
    }

    setRealtimeMicrophoneEnabled(false);
    setAvatarState("speaking");
    setErrorMessage(null);
    pushDebugEvent("speaker.start", "Router answer sent to realtime speaker.");

    try {
      dataChannel.send(
        JSON.stringify({
          type: "response.create",
          response: {
            output_modalities: ["audio"],
            instructions: [
              "You are only the voice speaker for AiXia Assistant.",
              "Do not add new facts.",
              "Do not answer differently.",
              "Do not summarize.",
              "Speak exactly this answer in a clear professional voice:",
              cleanAnswer,
            ].join("\n"),
          },
        })
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Realtime speaker failed to start voice playback."
      );
      pushDebugEvent("speaker.error");
      setRealtimeMicrophoneEnabled(true);
      setAvatarState("idle");
      return;
    }

    speakingSafetyTimerRef.current = window.setTimeout(() => {
      if (realtimeConnectionRef.current) {
        setErrorMessage(
          "Realtime voice playback did not report completion. Microphone was restored automatically."
        );
        pushDebugEvent("speaker.safety_timeout");
        setRealtimeMicrophoneEnabled(true);
        setAvatarState("idle");
      }

      speakingSafetyTimerRef.current = null;
    }, 30000);
  }

  async function handleRealtimeRouterAnswer(question: string, itemId: string) {
    const cleanQuestion = question.trim();

    if (!cleanQuestion || cleanQuestion.length < 2) return;
    if (routedRealtimeQuestionsRef.current.has(itemId)) return;

    routedRealtimeQuestionsRef.current.add(itemId);
    setRealtimeMicrophoneEnabled(false);
    setAvatarState("thinking");
    setErrorMessage(null);
    setProvider("");
    setModel("");
    updateLatency({
      routerStartedAt: performance.now(),
    });
    pushDebugEvent("router.start", cleanQuestion.slice(0, 90));

    try {
      const result = await askAI(cleanQuestion, { mode: "voice" });
      const routerCompletedAt = performance.now();

      updateLatency({
        routerCompletedAt,
      });

      const assistantMessage: Message = {
        id: `realtime-router-answer-${itemId}`,
        role: "assistant",
        content: result.text || "No response received.",
        provider: result.provider || "",
        model: result.model || "",
        router_layer: resolveRouterLayer(result.provider, result.debug?.layer),
        router_reason: result.debug?.reason,
        matched_question: result.matched_question,
        similarity: result.similarity,
      };

      upsertRealtimeMessage({
        id: assistantMessage.id,
        role: "assistant",
        content: assistantMessage.content,
        provider: assistantMessage.provider,
        model: assistantMessage.model,
        routerLayer: assistantMessage.router_layer,
      });

      setLastAiReply(assistantMessage.content);
      setProvider(result.provider || "");
      setModel(result.model || "");
      pushDebugEvent(
        "router.done",
        `${result.provider || "unknown"} · ${result.model || "unknown"}`
      );

      await saveConversationMessage(assistantMessage);

      speakRouterAnswerWithRealtime(assistantMessage.content);
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : "AI router request failed.";

      updateLatency({
        routerCompletedAt: performance.now(),
      });

      upsertRealtimeMessage({
        id: `realtime-router-error-${itemId}`,
        role: "assistant",
        content: fallbackMessage,
        provider: "client-error",
        model: "n/a",
        routerLayer: "error",
      });

      setLastAiReply(fallbackMessage);
      setErrorMessage(fallbackMessage);
      pushDebugEvent("router.error", fallbackMessage);
      setRealtimeMicrophoneEnabled(true);
      setAvatarState("idle");
    }
  }

  function handleRealtimeEvent(event: MessageEvent) {
    const rawMessage = String(event.data ?? "");

    if (!rawMessage) return;

    try {
      const parsed = JSON.parse(rawMessage) as {
        type?: string;
        item_id?: string;
        response_id?: string;
        transcript?: string;
        delta?: string;
        error?: {
          message?: string;
          type?: string;
          code?: string;
        };
      };

      const eventType = parsed.type ?? "realtime.event";

      if (
        eventType === "input_audio_buffer.speech_started" ||
        eventType === "input_audio_buffer.speech_stopped" ||
        eventType === "conversation.item.input_audio_transcription.delta" ||
        eventType === "conversation.item.input_audio_transcription.completed" ||
        eventType === "response.created" ||
        eventType === "response.audio.delta" ||
        eventType === "response.audio.done" ||
        eventType === "response.output_audio.delta" ||
        eventType === "response.output_audio.done" ||
        eventType === "response.done" ||
        eventType === "error"
      ) {
        pushDebugEvent(eventType);
      }

      if (eventType === "input_audio_buffer.speech_started") {
        resetLatencyTurn();
        updateLatency({
          speechStartedAt: performance.now(),
        });
        setRealtimeMicrophoneEnabled(true);
        setAvatarState("listening");
      }

      if (eventType === "error") {
        if (speakingSafetyTimerRef.current) {
          window.clearTimeout(speakingSafetyTimerRef.current);
          speakingSafetyTimerRef.current = null;
        }

        const message = parsed.error?.message || "Realtime voice returned an error.";

        setErrorMessage(message);
        pushDebugEvent("realtime.error", message);
        setRealtimeMicrophoneEnabled(true);
        setAvatarState("idle");
        return;
      }

      if (eventType === "input_audio_buffer.speech_stopped") {
        updateLatency({
          speechStoppedAt: performance.now(),
        });
        setRealtimeMicrophoneEnabled(true);
        setAvatarState("thinking");
      }

      if (eventType === "conversation.item.input_audio_transcription.delta") {
        const itemId = parsed.item_id ?? "active-user-transcript";
        const nextText = `${userTranscriptDraftsRef.current[itemId] ?? ""}${
          parsed.delta ?? ""
        }`;

        userTranscriptDraftsRef.current[itemId] = nextText;
        setLastTranscript(nextText);

        upsertRealtimeMessage({
          id: `realtime-user-${itemId}`,
          role: "user",
          content: nextText,
          provider: "openai-realtime",
          model,
          routerLayer: "realtime-transcript",
        });
      }

      if (
        eventType === "conversation.item.input_audio_transcription.completed"
      ) {
        const itemId = parsed.item_id ?? "active-user-transcript";
        const completedText =
          parsed.transcript ?? userTranscriptDraftsRef.current[itemId] ?? "";

        updateLatency({
          transcriptCompletedAt: performance.now(),
        });

        userTranscriptDraftsRef.current[itemId] = completedText;
        setLastTranscript(completedText);

        const userMessage: Message = {
          id: `realtime-user-${itemId}`,
          role: "user",
          content: completedText,
          provider: "openai-realtime",
          model,
          router_layer: "realtime-transcript",
        };

        upsertRealtimeMessage({
          id: userMessage.id,
          role: "user",
          content: completedText,
          provider: userMessage.provider,
          model: userMessage.model,
          routerLayer: userMessage.router_layer,
        });

        void saveConversationMessage(userMessage);
        void handleRealtimeRouterAnswer(completedText, itemId);
      }

      if (eventType === "response.created") {
        updateLatency({
          responseCreatedAt: performance.now(),
        });
        setRealtimeMicrophoneEnabled(false);
        setAvatarState("speaking");
      }

      if (
        eventType === "response.audio.delta" ||
        eventType === "response.output_audio.delta"
      ) {
        if (!firstAudioDeltaCapturedRef.current) {
          firstAudioDeltaCapturedRef.current = true;
          updateLatency({
            firstAudioDeltaAt: performance.now(),
          });
        }

        setRealtimeMicrophoneEnabled(false);
        setAvatarState("speaking");
      }

      if (
        eventType === "response.audio.done" ||
        eventType === "response.output_audio.done" ||
        eventType === "response.done"
      ) {
        if (speakingSafetyTimerRef.current) {
          window.clearTimeout(speakingSafetyTimerRef.current);
          speakingSafetyTimerRef.current = null;
        }

        updateLatency({
          audioDoneAt: performance.now(),
        });
        setRealtimeMicrophoneEnabled(true);
        setAvatarState("idle");
      }
    } catch {
      pushDebugEvent("raw.event", rawMessage.slice(0, 100));
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

    userTranscriptDraftsRef.current = {};
    assistantTranscriptDraftsRef.current = {};
    routedRealtimeQuestionsRef.current.clear();
    resetLatencyTurn();
    setRealtimeConnecting(true);
    setErrorMessage(null);
    setActionMessage(null);
    setDebugEvents([]);

    try {
      if (!sessionOpen) {
        await openSession();
      }

      const realtimeSession = await createRealtimeVoiceSession({
        model: "gpt-realtime-mini",
        voice: settings.voice_name || "marin",
        instructions: buildRealtimeInstructions(),
        threshold: Number(settings.realtime_vad_threshold),
        prefix_padding_ms: Number(settings.realtime_prefix_padding_ms),
        silence_duration_ms: Number(settings.realtime_silence_duration_ms),
        idle_timeout_ms:
          Number(settings.realtime_idle_timeout_ms) > 0
            ? Number(settings.realtime_idle_timeout_ms)
            : null,
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
      pushDebugEvent("session.connected", realtimeSession.model);

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content:
            "Router-first realtime voice is connected. Speak naturally and AiXia will route the answer through approved answers, cache, knowledge, and guardrails before speaking.",
          provider: "openai-realtime",
          model: realtimeSession.model,
          router_layer: "realtime-router-first",
        },
      ]);

      setActionMessage("Realtime conversation started.");
    } catch (error) {
      closeRealtimeConnection();
      setAvatarState(sessionOpen ? "idle" : "offline");
      setErrorMessage(
        error instanceof Error ? error.message : "Realtime session failed."
      );
      pushDebugEvent(
        "session.error",
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
    pushDebugEvent("session.ended");
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
        latency_metrics: latencyRef.current,
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
      setLastAiReply(assistantMessage.content);
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
      setLastAiReply(errorMessage.content);
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
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-5">
        <header className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
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
                  Router-First Realtime Voice
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                    Voice Testing Studio
                  </h1>
                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                    Unified realtime testing workspace for avatar state, transcript,
                    router-first answers, VAD tuning, debug events, and latency metrics.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[820px]">
              <MetricCard
                icon={Radio}
                label="Realtime"
                value={formatPercent(settings.voice_enabled)}
                tone={settings.voice_enabled ? "emerald" : "rose"}
              />
              <MetricCard
                icon={Zap}
                label="Connection"
                value={realtimeOpen ? "LIVE" : "OFF"}
                tone={realtimeOpen ? "emerald" : "slate"}
              />
              <MetricCard
                icon={Bot}
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
                icon={Timer}
                label="Turn Time"
                value={formatMs(latencyMetrics.totalTurnMs)}
                tone={getMetricTone(latencyMetrics.totalTurnMs, 2500, 4500)}
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

        <section className="grid gap-5">
          <div className="grid min-h-[720px] overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.20),rgba(2,6,23,0.94)_42%,rgba(2,6,23,0.99))] shadow-2xl shadow-cyan-950/20 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="border-b border-white/10 bg-black/10 p-5 xl:border-b-0 xl:border-r">
              <div className="relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-[30px] border border-cyan-400/20 bg-black/30">
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
                    Avatar State
                  </div>

                  <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                    {getAvatarStateLabel(avatarState)}
                  </h3>
                  <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
                    Mic listens during user speech, mutes during AiXia speech,
                    and returns to listening after audio completes.
                  </p>
                </div>

                <div className="relative border-t border-white/10 bg-black/25 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <StatusPill
                      label="Session"
                      value={sessionOpen ? "OPEN" : "CLOSED"}
                      tone={sessionOpen ? "emerald" : "cyan"}
                    />
                    <StatusPill
                      label="Mic"
                      value={micStatus}
                      tone={micStatus === "ON" ? "emerald" : "cyan"}
                    />
                    <StatusPill
                      label="VAD"
                      value={`${settings.realtime_vad_threshold}`}
                      tone="violet"
                    />
                    <StatusPill
                      label="Silence"
                      value={`${settings.realtime_silence_duration_ms}ms`}
                      tone="cyan"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-[760px] min-w-0 flex-col">
              <div className="border-b border-white/10 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                      Realtime Test Session
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                      {voiceSummary}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                      Realtime is the ear and voice. Ai-router is the brain:
                      approved answers, exact cache, semantic cache, knowledge,
                      then OpenAI fallback only when needed.
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

                <div className="mt-4 grid gap-3 lg:grid-cols-4">
                  <StatusPill label="Provider" value={provider || "-"} tone="cyan" />
                  <StatusPill label="Model" value={model || "-"} tone="violet" />
                  <StatusPill
                    label="Router Layer"
                    value={
                      messages
                        .filter((message) => message.role === "assistant")
                        .at(-1)?.router_layer || "-"
                    }
                    tone="emerald"
                  />
                  <StatusPill
                    label="Realtime"
                    value={realtimeOpen ? "ON" : "OFF"}
                    tone={realtimeOpen ? "emerald" : "cyan"}
                  />
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_260px] gap-0">
                <div className="flex min-h-0 flex-col">
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
                          className={`max-w-[88%] rounded-[24px] px-4 py-3 text-sm leading-6 ${
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
                          Typed tests use the same ai-router. Voice tests also
                          speak the routed answer through realtime.
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

                <div className="min-h-0 border-t border-white/10 bg-black/10 p-5">
                  <div className="flex h-full min-h-0 flex-col rounded-[26px] border border-white/10 bg-black/25">
                    <div className="border-b border-white/10 px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                        Live Transcript
                      </div>
                    </div>

                    <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
                      <div className="min-h-0 overflow-y-auto border-b border-white/10 p-4 md:border-b-0 md:border-r">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          User Speech
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                          {lastTranscript || "User transcript will appear here."}
                        </p>
                      </div>

                      <div className="min-h-0 overflow-y-auto p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          AiXia Reply
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                          {lastAiReply || "Latest AI reply will appear here."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            <Panel
              eyebrow="Runtime Controls"
              title="Realtime Engine"
              description="Main switch and saved realtime configuration."
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
                  description="Controls microphone input and realtime voice output together."
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
              eyebrow="Phase 9"
              title="VAD + Timing Controls"
              description="Tune speech detection without changing backend code. Restart the conversation after saving."
            >
              <div className="grid gap-4">
                {vadSliders.map((slider) => {
                  const value = Number(settings[slider.key]);

                  return (
                    <SliderControl
                      key={slider.key}
                      slider={slider}
                      value={value}
                      onChange={(nextValue) =>
                        updateSetting(slider.key, nextValue)
                      }
                    />
                  );
                })}

                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-xs leading-5 text-cyan-100/80">
                  Current recommended baseline: threshold 0.58, prefix 250ms,
                  silence 650ms, idle timeout disabled.
                </div>
              </div>
            </Panel>

            <Panel
              eyebrow="Realtime Identity"
              title="Provider + Voice"
              description="Choose provider, voice identity, and speaking style."
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
                  label="Legacy TTS Model"
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
              eyebrow="Voice Tuning"
              title="Speech Controls"
              description="Provider-ready voice behavior controls."
            >
              <div className="grid gap-4">
                {voiceSliders.map((slider) => {
                  const value = Number(settings[slider.key]);

                  return (
                    <SliderControl
                      key={slider.key}
                      slider={slider}
                      value={value}
                      onChange={(nextValue) =>
                        updateSetting(slider.key, nextValue)
                      }
                    />
                  );
                })}
              </div>
            </Panel>

            <Panel
              eyebrow="Phase 8"
              title="Latency Metrics"
              description="Measured from realtime events and router calls."
            >
              <div className="grid gap-3">
                <LatencyRow
                  label="Speech stopped → transcript"
                  value={latencyMetrics.speechStoppedToTranscriptMs}
                  good={700}
                  ok={1200}
                />
                <LatencyRow
                  label="Transcript → router start"
                  value={latencyMetrics.transcriptToRouterMs}
                  good={100}
                  ok={250}
                />
                <LatencyRow
                  label="Router total"
                  value={latencyMetrics.routerTotalMs}
                  good={900}
                  ok={1800}
                />
                <LatencyRow
                  label="Router done → response created"
                  value={latencyMetrics.routerToResponseCreatedMs}
                  good={300}
                  ok={700}
                />
                <LatencyRow
                  label="Response created → first audio"
                  value={latencyMetrics.responseCreatedToFirstAudioMs}
                  good={500}
                  ok={1000}
                />
                <LatencyRow
                  label="Speech stopped → first audio"
                  value={latencyMetrics.speechStoppedToFirstAudioMs}
                  good={1800}
                  ok={3200}
                />
                <LatencyRow
                  label="Total turn"
                  value={latencyMetrics.totalTurnMs}
                  good={3000}
                  ok={5000}
                />
              </div>
            </Panel>

            <Panel
              eyebrow="Knowledge + Router"
              title="Answer Source"
              description="Shows the active answer source for the latest reply."
            >
              <div className="grid gap-3">
                <StatusPill label="Provider" value={provider || "-"} tone="cyan" />
                <StatusPill label="Model" value={model || "-"} tone="violet" />
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
              description="Scrollable realtime and router event trail."
            >
              <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {debugEvents.length > 0 ? (
                  debugEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-cyan-100">
                          {event.type}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {event.time}
                        </span>
                      </div>
                      {event.detail ? (
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {event.detail}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-500">
                    Debug events will appear after Start Conversation connects.
                  </div>
                )}
              </div>
            </Panel>

            <Panel
              eyebrow="Realtime Notes"
              title="Conversation Notes"
              description="Optional internal notes injected into realtime test instructions."
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
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Radio;
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <p className={`mt-2 truncate text-3xl font-semibold ${toneClass}`}>
        {value}
      </p>
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

function LatencyRow({
  label,
  value,
  good,
  ok,
}: {
  label: string;
  value: number | null;
  good: number;
  ok: number;
}) {
  const tone = getMetricTone(value, good, ok);
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
      : tone === "rose"
        ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
        : tone === "cyan"
          ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
          : "border-white/10 bg-black/20 text-slate-400";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs leading-5">{label}</span>
        <span className="text-sm font-semibold">{formatMs(value)}</span>
      </div>
    </div>
  );
}

function SliderControl({
  slider,
  value,
  onChange,
}: {
  slider: VoiceSlider;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
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
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 w-full accent-cyan-400"
      />

      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{slider.lowLabel}</span>
        <span>{slider.highLabel}</span>
      </div>
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
