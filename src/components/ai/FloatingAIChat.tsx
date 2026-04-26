"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Mic,
  MonitorPlay,
  Power,
  Radio,
  SendHorizontal,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { askAI } from "@/lib/ai/aiRouter";
import type { AvatarPackLayerKey } from "@/lib/ai/avatarPack";
import { AvatarPackRuntime } from "@/components/ai/avatar/AvatarPackRuntime";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
  router_layer?: string;
  router_reason?: string;
  matched_question?: string;
  similarity?: number;
  feedback?: "liked" | "disliked";
};

type ChatMode = "text" | "voice_text" | "face_to_face";

type AnimationMode =
  | "orb"
  | "waveform"
  | "robot"
  | "hologram"
  | "mascot"
  | "uploaded_asset";

type AvatarState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "paused"
  | "error";

type AiSettingRow = {
  setting_key: string;
  setting_value: {
    value?: unknown;
  } | null;
};

type VoiceRuntimeSettings = {
  voice_enabled: boolean;
  voice_tts_enabled: boolean;
  voice_stt_enabled: boolean;
  voice_name: string;
  voice_speed: number;
  voice_pitch: number;
};

type AnimationRuntimeSettings = {
  mode: AnimationMode;
  lipSyncEnabled: boolean;
  voiceReactiveEnabled: boolean;
  selectedAssetId: string;
};

type AvatarPackSignedUrls = Partial<Record<AvatarPackLayerKey, string>>;

type AvatarPackRuntimeAsset = {
  id: string;
  name: string;
  avatarPackLayerSignedUrls: AvatarPackSignedUrls;
};

type AvatarAssetRow = {
  id: string;
  name: string;
  bucket_id: string | null;
  status: "active" | "archived" | "deleted";
  is_selected: boolean;
  metadata: Record<string, unknown> | null;
};

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

const AVATAR_BUCKET = "ai-avatar-assets";

const avatarPackLayerKeys: AvatarPackLayerKey[] = [
  "base_avatar",
  "eyes_open",
  "eyes_closed",
  "mouth_rest",
  "mouth_small",
  "mouth_medium",
  "mouth_open",
  "mouth_round",
];

const defaultVoiceSettings: VoiceRuntimeSettings = {
  voice_enabled: false,
  voice_tts_enabled: true,
  voice_stt_enabled: true,
  voice_name: "alloy",
  voice_speed: 1.15,
  voice_pitch: 50,
};

const defaultAnimationSettings: AnimationRuntimeSettings = {
  mode: "orb",
  lipSyncEnabled: true,
  voiceReactiveEnabled: true,
  selectedAssetId: "",
};

function createMessageId() {
  return crypto.randomUUID();
}

function resolveRouterLayer(provider?: string, debugLayer?: string) {
  if (debugLayer) return debugLayer;
  if (!provider) return null;

  if (provider.includes("approved")) return "approved";
  if (provider === "cache") return "exact-cache";
  if (provider === "semantic-cache") return "semantic-cache";
  if (provider.includes("guardrails")) return "guardrails";
  if (provider.includes("openai")) return "openai";
  if (provider.includes("controlled-refusal")) return "controlled-refusal";

  return provider;
}

function readSettingValue(row: AiSettingRow) {
  return row.setting_value?.value;
}

function isAnimationMode(value: unknown): value is AnimationMode {
  return (
    value === "orb" ||
    value === "waveform" ||
    value === "robot" ||
    value === "hologram" ||
    value === "mascot" ||
    value === "uploaded_asset"
  );
}

function isPreparedAvatarPack(metadata: Record<string, unknown> | null) {
  return metadata?.avatar_pack_status === "avatar_pack_ready";
}

function getAvatarLayerStoragePath(
  metadata: Record<string, unknown> | null,
  layerKey: AvatarPackLayerKey
) {
  const manifest = metadata?.avatar_pack_manifest;

  if (!manifest || typeof manifest !== "object") return null;

  const layers = (manifest as {
    layers?: Partial<
      Record<
        AvatarPackLayerKey,
        {
          storage_path?: unknown;
        }
      >
    >;
  }).layers;

  const layer = layers?.[layerKey];
  const storagePath = layer?.storage_path;

  return typeof storagePath === "string" ? storagePath : null;
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function clampSpeechRate(value: number) {
  if (!Number.isFinite(value)) return 1.15;
  return Math.min(2, Math.max(0.5, value));
}

function convertPitchToBrowserPitch(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(2, Math.max(0, value / 50));
}

function getModeLabel(mode: AnimationMode) {
  if (mode === "orb") return "Orb";
  if (mode === "waveform") return "Waveform";
  if (mode === "robot") return "Robot";
  if (mode === "hologram") return "Hologram";
  if (mode === "mascot") return "Mascot";
  return "Uploaded Avatar";
}

export default function FloatingAIChat() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("text");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [voiceSettings, setVoiceSettings] =
    useState<VoiceRuntimeSettings>(defaultVoiceSettings);
  const [animationSettings, setAnimationSettings] =
    useState<AnimationRuntimeSettings>(defaultAnimationSettings);
  const [runtimeAvatar, setRuntimeAvatar] =
    useState<AvatarPackRuntimeAsset | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: createMessageId(),
      role: "assistant",
      content: "Hello. Ask me anything.",
    },
  ]);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const silenceTimerRef = useRef<number | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef<ChatMode>("text");
  const openRef = useRef(false);
  const loadingRef = useRef(false);

  const speechSupported = useMemo(
    () => Boolean(getSpeechRecognitionConstructor()),
    []
  );

  const faceToFaceReady =
    voiceSettings.voice_enabled &&
    voiceSettings.voice_stt_enabled &&
    voiceSettings.voice_tts_enabled &&
    (animationSettings.mode !== "uploaded_asset" || Boolean(runtimeAvatar));

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

    useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    if (!open || mode === "face_to_face") return;

    const scrollFrame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });

    return () => {
      window.cancelAnimationFrame(scrollFrame);
    };
  }, [messages, loading, open, mode]);

  useEffect(() => {
    void loadRuntimeControls();

    return () => {
      clearSilenceTimer();
      stopListening();
      stopVoiceOutput();
    };
  }, []);
  
  useEffect(() => {
    if (!open) return;

    void loadRuntimeControls();

    const intervalId = window.setInterval(() => {
      void loadRuntimeControls();
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [open]);

  function clearSilenceTimer() {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }

  async function loadRuntimeControls() {
    const settingKeys = [
      "voice_enabled",
      "voice_tts_enabled",
      "voice_stt_enabled",
      "voice_name",
      "voice_speed",
      "voice_pitch",
      "animation_avatar_mode",
      "animation_lip_sync_enabled",
      "animation_voice_reactive_enabled",
      "animation_selected_asset_id",
    ];

    const { data: settingsData, error: settingsError } = await supabase
      .from("ai_settings")
      .select("setting_key, setting_value")
      .in("setting_key", settingKeys);

    if (settingsError) {
      console.error("AI chat settings load error:", settingsError);
    }

    const nextVoiceSettings = { ...defaultVoiceSettings };
    const nextAnimationSettings = { ...defaultAnimationSettings };

    (settingsData as AiSettingRow[] | null)?.forEach((row) => {
      const value = readSettingValue(row);

      if (row.setting_key === "voice_enabled") {
        nextVoiceSettings.voice_enabled = value === true;
      }

      if (row.setting_key === "voice_tts_enabled") {
        nextVoiceSettings.voice_tts_enabled = value !== false;
      }

      if (row.setting_key === "voice_stt_enabled") {
        nextVoiceSettings.voice_stt_enabled = value !== false;
      }

      if (row.setting_key === "voice_name" && typeof value === "string") {
        nextVoiceSettings.voice_name = value;
      }

      if (row.setting_key === "voice_speed" && typeof value === "number") {
        nextVoiceSettings.voice_speed = value;
      }

      if (row.setting_key === "voice_pitch" && typeof value === "number") {
        nextVoiceSettings.voice_pitch = value;
      }

      if (row.setting_key === "animation_avatar_mode" && isAnimationMode(value)) {
        nextAnimationSettings.mode = value;
      }

      if (row.setting_key === "animation_lip_sync_enabled") {
        nextAnimationSettings.lipSyncEnabled = value !== false;
      }

      if (row.setting_key === "animation_voice_reactive_enabled") {
        nextAnimationSettings.voiceReactiveEnabled = value !== false;
      }

      if (
        row.setting_key === "animation_selected_asset_id" &&
        typeof value === "string"
      ) {
        nextAnimationSettings.selectedAssetId = value;
      }
    });

    setVoiceSettings(nextVoiceSettings);
    setAnimationSettings(nextAnimationSettings);

    if (nextAnimationSettings.mode === "uploaded_asset") {
      await loadRuntimeAvatar(nextAnimationSettings.selectedAssetId);
    } else {
      setRuntimeAvatar(null);
    }
  }

  async function loadRuntimeAvatar(selectedAssetId: string) {
    let query = supabase
      .from("ai_avatar_assets")
      .select("id, name, bucket_id, status, is_selected, metadata")
      .eq("status", "active");

    if (selectedAssetId) {
      query = query.eq("id", selectedAssetId);
    } else {
      query = query.eq("is_selected", true);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.error("AI chat avatar load error:", error);
      return;
    }

    const asset = data as AvatarAssetRow | null;

    if (!asset || !isPreparedAvatarPack(asset.metadata)) {
      setRuntimeAvatar(null);
      return;
    }

    const signedUrls: AvatarPackSignedUrls = {};

    await Promise.all(
      avatarPackLayerKeys.map(async (layerKey) => {
        const storagePath = getAvatarLayerStoragePath(asset.metadata, layerKey);
        if (!storagePath) return;

        const { data: signedUrlData, error: signedUrlError } =
          await supabase.storage
            .from(asset.bucket_id || AVATAR_BUCKET)
            .createSignedUrl(storagePath, 60 * 60);

        if (signedUrlError) {
          console.error("AI chat avatar signed URL error:", signedUrlError);
          return;
        }

        signedUrls[layerKey] = signedUrlData.signedUrl;
      })
    );

    if (!signedUrls.base_avatar) {
      setRuntimeAvatar(null);
      return;
    }

    setRuntimeAvatar({
      id: asset.id,
      name: asset.name,
      avatarPackLayerSignedUrls: signedUrls,
    });
  }

  async function getOrCreateSession(firstPrompt: string) {
    if (sessionId) return sessionId;

    const { data, error } = await supabase
      .from("ai_conversation_sessions")
      .insert({
        title: firstPrompt.slice(0, 120),
        source: "floating_ai_chat",
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      console.error("AI session create error:", error);
      return null;
    }

    const nextSessionId = data.id as string;
    setSessionId(nextSessionId);

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "ai_session_started",
      entity_type: "memory",
      entity_id: nextSessionId,
      details: {
        source: "floating_ai_chat",
        mode,
        animation_mode: animationSettings.mode,
        title: firstPrompt.slice(0, 120),
      },
    });

    return nextSessionId;
  }

  async function saveConversationMessage({
    activeSessionId,
    message,
    activeMode,
  }: {
    activeSessionId: string | null;
    message: Message;
    activeMode: ChatMode;
  }) {
    if (!activeSessionId) return;

    const { error } = await supabase.from("ai_conversation_messages").insert({
      session_id: activeSessionId,
      role: message.role,
      content: message.content,
      provider: message.provider ?? null,
      model: message.model ?? null,
      router_layer: message.router_layer ?? null,
      router_reason: message.router_reason ?? null,
      matched_question: message.matched_question ?? null,
      similarity: message.similarity ?? null,
      feedback: message.feedback ?? null,
      metadata: {
        source: "floating_ai_chat",
        mode: activeMode,
        animation_mode: animationSettings.mode,
        avatar_asset_id: runtimeAvatar?.id ?? null,
      },
    });

    if (error) {
      console.error("AI message save error:", error);
    }
  }

  async function handleSend(promptOverride?: string, modeOverride?: ChatMode) {
    const activeMode = modeOverride ?? mode;
    const cleanInput = (promptOverride ?? input).trim();

    if (!cleanInput || loadingRef.current) return;

    const activeSessionId = await getOrCreateSession(cleanInput);

    const userMessage: Message = {
      id: createMessageId(),
      role: "user",
      content: cleanInput,
    };

    const nextMessages: Message[] = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setLiveTranscript("");
    setStatusMessage("");
    setLoading(true);
    setAvatarState(activeMode === "face_to_face" ? "thinking" : "idle");

    await saveConversationMessage({
      activeSessionId,
      message: userMessage,
      activeMode,
    });

    try {
      const result = await askAI(cleanInput, {
        mode: activeMode === "text" ? "text" : "voice",
      });

      const assistantMessage: Message = {
        id: createMessageId(),
        role: "assistant",
        content: result.text || "No response received.",
        provider: result.provider || "",
        model: result.model || "",
        router_layer:
          resolveRouterLayer(result.provider, result.debug?.layer) ?? undefined,
        router_reason: result.debug?.reason,
        matched_question: result.matched_question,
        similarity: result.similarity,
      };

      setMessages([...nextMessages, assistantMessage]);

      await saveConversationMessage({
        activeSessionId,
        message: assistantMessage,
        activeMode,
      });

      if (activeMode === "face_to_face") {
        speakAssistantMessage(assistantMessage.content);
      } else {
        setAvatarState("idle");
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
      setAvatarState("error");

      await saveConversationMessage({
        activeSessionId,
        message: errorMessage,
        activeMode,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter") return;
    if (event.shiftKey) return;

    event.preventDefault();
    void handleSend();
  }

  function switchToTextMode() {
    clearSilenceTimer();
    stopListening();
    stopVoiceOutput();
    setMode("text");
    setAvatarState("idle");
    setStatusMessage("");
    setLiveTranscript("");
  }

  function startVoiceText() {
    clearSilenceTimer();
    stopVoiceOutput();
    setMode("voice_text");
    void startListening("voice_text");
  }

  async function startFaceToFace() {
    clearSilenceTimer();
    stopVoiceOutput();
    setMode("face_to_face");
    setStatusMessage("");
    setLiveTranscript("");
    await loadRuntimeControls();
    void startListening("face_to_face");
  }

  async function startListening(nextMode: ChatMode) {
    if (!speechSupported) {
      setStatusMessage("Speech recognition is not supported in this browser.");
      setAvatarState("error");
      return;
    }

    if (!voiceSettings.voice_stt_enabled) {
      setStatusMessage("Speech to text is disabled in AI Management → Voice.");
      setAvatarState("error");
      return;
    }

    if (nextMode === "face_to_face" && !faceToFaceReady) {
      setStatusMessage(
        animationSettings.mode === "uploaded_asset"
          ? "Face-to-face needs Voice enabled, STT enabled, TTS enabled, and a prepared active avatar pack."
          : "Face-to-face needs Voice enabled, STT enabled, and TTS enabled in AI Management → Voice."
      );
      setAvatarState("error");
      return;
    }

    stopListening();
    finalTranscriptRef.current = "";

    const RecognitionConstructor = getSpeechRecognitionConstructor();
    if (!RecognitionConstructor) return;

    const recognition = new RecognitionConstructor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript.trim()) {
        finalTranscriptRef.current =
          `${finalTranscriptRef.current} ${finalTranscript}`.trim();
      }

      setLiveTranscript(interimTranscript || finalTranscriptRef.current);

      clearSilenceTimer();

      silenceTimerRef.current = window.setTimeout(() => {
        const cleanTranscript = finalTranscriptRef.current.trim();

        if (!cleanTranscript) return;

        stopListening();
        void handleSend(cleanTranscript, nextMode);
      }, 900);
    };

    recognition.onerror = (event) => {
      clearSilenceTimer();
      setListening(false);
      setStatusMessage(`Microphone error: ${event.error}`);
      setAvatarState("error");
    };

    recognition.onend = () => {
      setListening(false);
      clearSilenceTimer();

      const cleanTranscript = finalTranscriptRef.current.trim();

      if (cleanTranscript && !loadingRef.current) {
        void handleSend(cleanTranscript, nextMode);
        return;
      }

      if (nextMode === "face_to_face" && !loadingRef.current) {
        setAvatarState("idle");
        setStatusMessage("Tap the microphone to talk again.");
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
      setAvatarState(nextMode === "face_to_face" ? "listening" : "idle");
      setStatusMessage(
        nextMode === "face_to_face"
          ? "Listening..."
          : "Listening. I will send automatically when you finish."
      );
    } catch (error) {
      setListening(false);
      setStatusMessage(
        error instanceof Error ? error.message : "Could not start microphone."
      );
      setAvatarState("error");
    }
  }

  function stopListening() {
    const recognition = recognitionRef.current;

    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
      recognitionRef.current = null;
    }

    setListening(false);
  }

  function speakAssistantMessage(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setAvatarState("idle");
      setStatusMessage("Browser speech output is unavailable.");
      return;
    }

    if (!voiceSettings.voice_tts_enabled) {
      setAvatarState("idle");
      setStatusMessage("TTS is disabled in AI Management → Voice.");
      return;
    }

    stopVoiceOutput();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((voice) =>
      voice.name.toLowerCase().includes(voiceSettings.voice_name.toLowerCase())
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = clampSpeechRate(voiceSettings.voice_speed);
    utterance.pitch = convertPitchToBrowserPitch(voiceSettings.voice_pitch);

    utterance.onstart = () => {
      setAvatarState("speaking");
      setStatusMessage("Speaking...");
    };

    utterance.onend = () => {
      setAvatarState("idle");
      setStatusMessage("");

      if (openRef.current && modeRef.current === "face_to_face") {
        void startListening("face_to_face");
      }
    };

    utterance.onerror = () => {
      setAvatarState("error");
      setStatusMessage("Speech output failed.");
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopVoiceOutput() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  async function endSession() {
    clearSilenceTimer();
    stopListening();
    stopVoiceOutput();

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
        action_type: "ai_session_ended",
        entity_type: "memory",
        entity_id: sessionId,
        details: {
          source: "floating_ai_chat",
          mode,
          animation_mode: animationSettings.mode,
        },
      });
    }

    setSessionId(null);
    setInput("");
    setLiveTranscript("");
    setMode("text");
    setAvatarState("idle");
    setStatusMessage("");
    setMessages([
      {
        id: createMessageId(),
        role: "assistant",
        content: "Session ended. Start a new message when you are ready.",
      },
    ]);
  }

  async function updateFeedback(message: Message, feedback: "liked" | "disliked") {
    if (!sessionId || message.role !== "assistant") return;

    setMessages((current) =>
      current.map((item) => (item.id === message.id ? { ...item, feedback } : item))
    );

    const { error } = await supabase
      .from("ai_conversation_messages")
      .update({ feedback })
      .eq("session_id", sessionId)
      .eq("role", "assistant")
      .eq("content", message.content);

    if (error) {
      console.error("AI feedback update error:", error);
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: feedback === "liked" ? "ai_message_liked" : "ai_message_disliked",
      entity_type: "memory",
      entity_id: sessionId,
      details: {
        provider: message.provider ?? null,
        model: message.model ?? null,
        router_layer: message.router_layer ?? null,
        router_reason: message.router_reason ?? null,
      },
    });
  }

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  return (
    <>
      {open && mode !== "face_to_face" && (
        <div className="fixed bottom-24 right-6 z-[100] flex h-[700px] w-[440px] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#0b101c]/95 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl">
          <div className="relative overflow-hidden border-b border-white/10 px-5 py-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.16),transparent_38%),radial-gradient(circle_at_88%_0%,rgba(139,92,246,0.13),transparent_34%)]" />

            <div className="relative flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      AiXia Assistant
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      Controlled by AI Management
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void endSession()}
                  className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs text-slate-300 transition-all duration-300 hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
                >
                  End Session
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearSilenceTimer();
                    stopListening();
                    stopVoiceOutput();
                    setOpen(false);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-slate-300 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-3 py-2 text-[11px] leading-5 text-emerald-100/75">
              Active animation:{" "}
              <span className="font-semibold text-emerald-100">
                {getModeLabel(animationSettings.mode)}
              </span>
              {" · "}
              Chat refreshes from AI Management automatically.
            </div>
          </div>

                   <div
            ref={messagesViewportRef}
            className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_35%)] px-4 py-5"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[86%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-lg ${
                    message.role === "user"
                      ? "border border-cyan-200/30 bg-gradient-to-br from-cyan-100 to-white text-slate-950 shadow-cyan-950/20"
                      : "border border-white/10 bg-white/[0.055] text-slate-100 shadow-black/20 backdrop-blur-xl"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>

                  {message.role === "assistant" && message.provider && (
                    <div className="mt-3 border-t border-white/10 pt-2 text-[10px] text-slate-500">
                      {message.router_layer || message.provider}
                      {message.model ? ` · ${message.model}` : ""}
                    </div>
                  )}

                  {message.role === "assistant" && message.id !== messages[0]?.id && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void updateFeedback(message, "liked")}
                        disabled={message.feedback === "liked"}
                        className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2.5 py-1 text-[10px] text-emerald-200/75 transition-all duration-300 hover:border-emerald-400/30 hover:text-emerald-100 disabled:opacity-50"
                      >
                        Good
                      </button>

                      <button
                        type="button"
                        onClick={() => void updateFeedback(message, "disliked")}
                        disabled={message.feedback === "disliked"}
                        className="rounded-full border border-rose-400/15 bg-rose-500/10 px-2.5 py-1 text-[10px] text-rose-200/75 transition-all duration-300 hover:border-rose-400/30 hover:text-rose-100 disabled:opacity-50"
                      >
                        Bad
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100/70">
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-white/10 bg-[#070b14]/92 px-4 py-4">
            {(statusMessage || liveTranscript) && (
              <div className="mb-3 rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-3 py-2 text-xs leading-5 text-cyan-100/75">
                {liveTranscript || statusMessage}
              </div>
            )}

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-2 shadow-xl shadow-black/20 backdrop-blur-xl">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Message AiXia..."
                className="min-h-[82px] w-full resize-none bg-transparent px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500"
              />

              <div className="flex items-center justify-between gap-3 px-1 pb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startVoiceText}
                    disabled={!speechSupported || loading}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
                      listening
                        ? "border-rose-400/30 bg-rose-500/15 text-rose-100"
                        : "border-white/10 bg-black/20 text-slate-300 hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-100"
                    }`}
                    aria-label="Start speech to text"
                  >
                    {listening ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => void startFaceToFace()}
                    disabled={loading}
                    className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-100/80 transition-all duration-300 hover:border-cyan-400/40 hover:bg-cyan-500/15 hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Talk face to face
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={loading || !input.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/30 transition-all duration-300 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send message"
                >
                  <SendHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-2 text-center text-[10px] text-slate-500">
              Enter to send · Shift + Enter for new line
            </div>
          </div>
        </div>
      )}

      {open && mode === "face_to_face" && (
        <div className="fixed inset-4 z-[100] flex overflow-hidden rounded-[36px] border border-white/10 bg-[#07111f]/95 shadow-2xl shadow-cyan-950/40 backdrop-blur-2xl">
          <div className="relative flex flex-1 flex-col overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_50%_68%,rgba(139,92,246,0.14),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.2),rgba(0,0,0,0.44))]" />

            <div className="absolute left-6 top-6 z-20 flex items-center gap-3">
              <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-100 backdrop-blur-xl">
                {listening
                  ? "Listening"
                  : loading
                    ? "Thinking"
                    : avatarState === "speaking"
                      ? "Speaking"
                      : "Face to Face"}
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-slate-300 backdrop-blur-xl">
                {getModeLabel(animationSettings.mode)}
              </div>
            </div>

            <div className="absolute right-6 top-6 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={switchToTextMode}
                className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-slate-300 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-100"
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to chat
                </span>
              </button>

              <button
                type="button"
                onClick={() => void endSession()}
                className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-slate-300 backdrop-blur-xl transition-all duration-300 hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
              >
                End Session
              </button>

              <button
                type="button"
                onClick={() => {
                  clearSilenceTimer();
                  stopListening();
                  stopVoiceOutput();
                  setOpen(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-slate-300 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1] hover:text-white"
                aria-label="Close face to face"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative z-10 flex flex-1 items-center justify-center p-8">
              {animationSettings.mode === "uploaded_asset" ? (
                runtimeAvatar ? (
                  <div className="h-[min(74vh,650px)] w-[min(74vh,650px)] rounded-[34px] border border-cyan-400/15 bg-white/[0.035] p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
                    <AvatarPackRuntime
                      asset={runtimeAvatar}
                      state={avatarState}
                      lipSyncEnabled={
                        animationSettings.lipSyncEnabled &&
                        animationSettings.voiceReactiveEnabled
                      }
                    />
                  </div>
                ) : (
                  <div className="max-w-md rounded-[30px] border border-amber-400/20 bg-amber-500/10 p-8 text-center shadow-2xl shadow-amber-950/20 backdrop-blur-xl">
                    <div className="text-sm font-semibold text-amber-100">
                      Uploaded avatar is not ready
                    </div>
                    <div className="mt-3 text-sm leading-6 text-amber-100/65">
                      AI Management is set to Uploaded Avatar. Select a prepared
                      avatar pack or choose Orb, Waveform, Robot, Hologram, or Mascot.
                    </div>
                  </div>
                )
              ) : (
                <NativeChatAnimation
                  mode={animationSettings.mode}
                  state={avatarState}
                  lipSyncEnabled={
                    animationSettings.lipSyncEnabled &&
                    animationSettings.voiceReactiveEnabled
                  }
                />
              )}
            </div>

            <div className="absolute bottom-6 left-1/2 z-20 w-[min(720px,calc(100%-48px))] -translate-x-1/2">
              <div className="rounded-[30px] border border-white/10 bg-[#06101d]/75 p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
                <div className="min-h-[24px] text-center text-sm leading-6 text-slate-200">
                  {liveTranscript ||
                    statusMessage ||
                    lastAssistantMessage?.content ||
                    "Start speaking when you are ready."}
                </div>

                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => void startListening("face_to_face")}
                    disabled={listening || loading || !faceToFaceReady}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/40 transition-all duration-300 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Start face to face listening"
                  >
                    <Mic className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      clearSilenceTimer();
                      stopListening();
                      stopVoiceOutput();
                      setAvatarState("paused");
                      setStatusMessage("Paused");
                    }}
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-slate-200 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1] hover:text-white"
                    aria-label="Pause face to face"
                  >
                    <Square className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={switchToTextMode}
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-rose-400/20 bg-rose-500/10 text-rose-100 transition-all duration-300 hover:border-rose-400/40 hover:bg-rose-500/15"
                    aria-label="End face to face"
                  >
                    <Power className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          void loadRuntimeControls();
        }}
        className="fixed bottom-6 right-6 z-[101] flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400 text-slate-950 shadow-2xl shadow-cyan-950/40 transition-all duration-300 hover:scale-105 hover:bg-cyan-300"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    </>
  );
}

function NativeChatAnimation({
  mode,
  state,
  lipSyncEnabled,
}: {
  mode: AnimationMode;
  state: AvatarState;
  lipSyncEnabled: boolean;
}) {
  const isSpeaking = state === "speaking" && lipSyncEnabled;
  const isListening = state === "listening";
  const isThinking = state === "thinking";
  const isSilent = state === "idle" || state === "paused" || state === "error";

  const mouthHeight =
    state === "speaking"
      ? 18
      : state === "listening"
        ? 7
        : state === "thinking"
          ? 4
          : 2;

  return (
    <div
      className="aixia-native-preview relative flex h-[min(72vh,640px)] w-[min(72vh,640px)] items-center justify-center overflow-hidden rounded-[42px] border border-white/10 bg-black/25 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl"
      data-state={state}
      data-mode={mode}
      style={
        {
          "--aixia-motion-duration": "2.4s",
          "--aixia-glow-opacity": "0.76",
          "--aixia-pulse-scale": "1.07",
          "--aixia-mouth-height": `${mouthHeight}px`,
          "--aixia-motion-opacity": isSilent ? "0.45" : "1",
        } as React.CSSProperties
      }
    >
      <style>{`
        @keyframes aixia-breathe {
          0%, 100% { transform: scale(1); opacity: 0.82; }
          50% { transform: scale(var(--aixia-pulse-scale)); opacity: 1; }
        }

        @keyframes aixia-speaking {
          0%, 100% { transform: scale(1) translateY(0); }
          25% { transform: scale(1.045) translateY(-2px); }
          50% { transform: scale(1.015) translateY(1px); }
          75% { transform: scale(1.06) translateY(-1px); }
        }

        @keyframes aixia-listening {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.035); }
        }

        @keyframes aixia-thinking {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes aixia-floating {
          0%, 100% { transform: translateY(0); opacity: 0.35; }
          50% { transform: translateY(-8px); opacity: 0.9; }
        }

        @keyframes aixia-wave {
          0%, 100% { transform: scaleY(0.42); opacity: 0.55; }
          50% { transform: scaleY(1); opacity: 1; }
        }

        @keyframes aixia-mouth {
          0%, 100% { height: 3px; width: 28px; opacity: 0.75; }
          35% { height: var(--aixia-mouth-height); width: 34px; opacity: 1; }
          70% { height: 5px; width: 24px; opacity: 0.9; }
        }

        @keyframes aixia-blink {
          0%, 88%, 100% { transform: scaleY(1); }
          92%, 96% { transform: scaleY(0.12); }
        }

        .aixia-native-preview .aixia-glow {
          opacity: var(--aixia-glow-opacity);
          animation: aixia-breathe var(--aixia-motion-duration) ease-in-out infinite;
        }

        .aixia-native-preview .aixia-avatar-shell {
          opacity: var(--aixia-motion-opacity);
          animation: aixia-breathe var(--aixia-motion-duration) ease-in-out infinite;
        }

        .aixia-native-preview[data-state="speaking"] .aixia-avatar-shell {
          animation: aixia-speaking 1.15s ease-in-out infinite;
        }

        .aixia-native-preview[data-state="listening"] .aixia-avatar-shell {
          animation: aixia-listening 1.35s ease-in-out infinite;
        }

        .aixia-native-preview[data-state="thinking"] .aixia-ring-outer,
        .aixia-native-preview[data-state="thinking"] .aixia-ring-inner {
          animation: aixia-thinking 3.2s linear infinite;
        }

        .aixia-native-preview .aixia-particle {
          animation: aixia-floating 2.8s ease-in-out infinite;
        }

        .aixia-native-preview .aixia-wave-bar {
          animation: aixia-wave 0.9s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .aixia-native-preview .aixia-wave-bar:nth-child(2) {
          animation-delay: 120ms;
        }

        .aixia-native-preview .aixia-wave-bar:nth-child(3) {
          animation-delay: 240ms;
        }

        .aixia-native-preview .aixia-wave-bar:nth-child(4) {
          animation-delay: 360ms;
        }

        .aixia-native-preview .aixia-wave-bar:nth-child(5) {
          animation-delay: 480ms;
        }

        .aixia-native-preview .aixia-mouth,
        .aixia-native-preview .aixia-orb-mouth {
          height: 3px;
          width: 28px;
          transition: all 260ms ease;
        }

        .aixia-native-preview[data-state="speaking"] .aixia-mouth,
        .aixia-native-preview[data-state="speaking"] .aixia-orb-mouth {
          animation: aixia-mouth 420ms ease-in-out infinite;
        }

        .aixia-native-preview .aixia-blink-eye {
          animation: aixia-blink 4.5s ease-in-out infinite;
          transform-origin: center;
        }

        .aixia-native-preview[data-state="idle"] .aixia-wave-bar,
        .aixia-native-preview[data-state="paused"] .aixia-wave-bar {
          animation-play-state: paused;
          opacity: 0.45;
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(34,211,238,0.20),transparent_44%),radial-gradient(circle_at_50%_74%,rgba(139,92,246,0.14),transparent_48%)]" />

      <div className="aixia-particle-layer absolute inset-0 opacity-60">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className="aixia-particle absolute h-1.5 w-1.5 rounded-full bg-cyan-200/40"
            style={{
              left: `${8 + ((index * 19) % 84)}%`,
              top: `${10 + ((index * 31) % 78)}%`,
              animationDelay: `${index * 0.12}s`,
            }}
          />
        ))}
      </div>

      <div className="aixia-glow absolute h-72 w-72 rounded-full bg-cyan-400 blur-3xl" />

      <div className="aixia-avatar-shell relative flex h-56 w-56 items-center justify-center rounded-full border border-cyan-300/60 bg-black/55 text-cyan-100 shadow-2xl shadow-cyan-400/30">
        <div className="aixia-ring aixia-ring-outer absolute inset-4 rounded-full border border-white/10" />
        <div className="aixia-ring aixia-ring-inner absolute inset-8 rounded-full border border-white/10" />
        <div className="aixia-scanner absolute inset-2 rounded-full border border-cyan-300/0" />

        {mode === "waveform" ? (
          <div className="flex h-28 items-center gap-2.5">
            {[32, 58, 88, 58, 32].map((height, index) => (
              <span
                key={index}
                className="aixia-wave-bar w-4 rounded-full bg-cyan-100/80 shadow-lg shadow-cyan-400/30"
                style={{ height }}
              />
            ))}
          </div>
        ) : null}

        {mode === "robot" ? (
          <div className="flex flex-col items-center justify-center">
            <Bot className="h-16 w-16 text-cyan-200" />
            <div className="mt-5 flex gap-5">
              <span className="h-3 w-3 rounded-full bg-cyan-100 shadow-lg shadow-cyan-400/40" />
              <span className="h-3 w-3 rounded-full bg-cyan-100 shadow-lg shadow-cyan-400/40" />
            </div>
            <div className="aixia-mouth mt-5 rounded-full bg-cyan-100/85" />
          </div>
        ) : null}

        {mode === "hologram" ? (
          <div className="aixia-hologram flex flex-col items-center gap-2">
            <MonitorPlay className="h-16 w-16 text-cyan-200" />
            <span className="h-1 w-24 rounded-full bg-cyan-200/50" />
            <span className="h-1 w-16 rounded-full bg-violet-200/35" />
          </div>
        ) : null}

        {mode === "mascot" ? (
          <div className="aixia-mascot-face flex h-32 w-32 flex-col items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/10 shadow-2xl shadow-cyan-400/10">
            <div className="flex gap-8">
              <span className="aixia-blink-eye h-3.5 w-3.5 rounded-full bg-cyan-100" />
              <span className="aixia-blink-eye h-3.5 w-3.5 rounded-full bg-cyan-100" />
            </div>
            <div className="aixia-mouth mt-6 rounded-full bg-cyan-100" />
          </div>
        ) : null}

        {mode === "orb" ? (
          <div className="aixia-orb-core relative flex h-32 w-32 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/20 shadow-2xl shadow-cyan-400/20">
            <div className="h-4 w-4 rounded-full bg-cyan-100/90 shadow-lg shadow-cyan-300/40" />
            <div className="aixia-orb-mouth absolute bottom-9 rounded-full bg-cyan-100/80" />
          </div>
        ) : null}
      </div>

      <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-6 py-3 text-center backdrop-blur-xl">
        <div className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200/70">
          <Radio className="h-3.5 w-3.5" />
          Native Animation State
        </div>
        <div className="mt-1 text-xl font-semibold text-emerald-100">
          {isListening
            ? "Listening"
            : isThinking
              ? "Thinking"
              : isSpeaking
                ? "Speaking"
                : state === "paused"
                  ? "Paused"
                  : state === "error"
                    ? "Error"
                    : "Idle"}
        </div>
      </div>
    </div>
  );
}
