"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
    Boolean(runtimeAvatar);

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
    }, 3500);

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

    await loadRuntimeAvatar(nextAnimationSettings.selectedAssetId);
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

  function startFaceToFace() {
    clearSilenceTimer();
    stopVoiceOutput();
    setMode("face_to_face");
    setStatusMessage("");
    setLiveTranscript("");
    void loadRuntimeControls();
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
        "Face-to-face needs Voice enabled, STT enabled, TTS enabled, and a prepared active avatar pack."
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
        finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalTranscript}`.trim();
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
        setStatusMessage("Tap Start to talk again.");
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
        <div className="fixed bottom-24 right-6 z-[100] flex h-[680px] w-[420px] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#070b14]/95 shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">AiXia Assistant</div>
              <div className="mt-1 text-xs text-white/45">
                Controlled by AI Management
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void endSession()}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 transition-all duration-300 hover:border-rose-400/30 hover:text-rose-200"
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
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm text-white/60 transition-all duration-300 hover:border-white/20 hover:text-white"
                aria-label="Close chat"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[86%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-white text-slate-950"
                      : "border border-white/10 bg-white/[0.045] text-white/85"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>

                  {message.role === "assistant" && message.provider && (
                    <div className="mt-2 border-t border-white/10 pt-2 text-[10px] text-white/35">
                      {message.router_layer || message.provider}
                      {message.model ? ` · ${message.model}` : ""}
                    </div>
                  )}

                  {message.role === "assistant" && message.id !== messages[0]?.id && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void updateFeedback(message, "liked")}
                        disabled={message.feedback === "liked"}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/50 transition-all duration-300 hover:text-emerald-200 disabled:opacity-50"
                      >
                        Good
                      </button>

                      <button
                        type="button"
                        onClick={() => void updateFeedback(message, "disliked")}
                        disabled={message.feedback === "disliked"}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/50 transition-all duration-300 hover:text-rose-200 disabled:opacity-50"
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
                <div className="rounded-[22px] border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white/50">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 px-4 py-4">
            {(statusMessage || liveTranscript) && (
              <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-5 text-white/55">
                {liveTranscript || statusMessage}
              </div>
            )}

            <div className="rounded-[26px] border border-white/10 bg-black/25 p-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Message AiXia..."
                className="min-h-[76px] w-full resize-none bg-transparent px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/30"
              />

              <div className="flex items-center justify-between gap-3 px-1 pb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startVoiceText}
                    disabled={!speechSupported || loading}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
                      listening
                        ? "border-rose-400/30 bg-rose-500/15 text-rose-100"
                        : "border-white/10 bg-white/[0.04] text-white/65 hover:border-white/20 hover:text-white"
                    }`}
                    aria-label="Start speech to text"
                  >
                    {listening ? "■" : "●"}
                  </button>

                  <button
                    type="button"
                    onClick={startFaceToFace}
                    disabled={loading}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/65 transition-all duration-300 hover:border-cyan-400/30 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Talk face to face
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={loading || !input.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-950 transition-all duration-300 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send message"
                >
                  ↑
                </button>
              </div>
            </div>

            <div className="mt-2 text-center text-[10px] text-white/30">
              Enter to send · Shift + Enter for new line
            </div>
          </div>
        </div>
      )}

      {open && mode === "face_to_face" && (
        <div className="fixed inset-4 z-[100] flex overflow-hidden rounded-[36px] border border-white/10 bg-[#05070d]/95 shadow-2xl shadow-black/50 backdrop-blur-2xl">
          <div className="relative flex flex-1 flex-col">
            <div className="absolute left-6 top-6 z-20 flex items-center gap-3">
              <div className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-medium text-white/70 backdrop-blur-xl">
                {listening
                  ? "Listening"
                  : loading
                    ? "Thinking"
                    : avatarState === "speaking"
                      ? "Speaking"
                      : "Face to Face"}
              </div>

              {runtimeAvatar && (
                <div className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs text-white/45 backdrop-blur-xl">
                  {runtimeAvatar.name}
                </div>
              )}
            </div>

            <div className="absolute right-6 top-6 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={switchToTextMode}
                className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-medium text-white/65 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:text-white"
              >
                Back to chat
              </button>

              <button
                type="button"
                onClick={() => void endSession()}
                className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-medium text-white/65 backdrop-blur-xl transition-all duration-300 hover:border-rose-400/30 hover:text-rose-200"
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
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-sm text-white/65 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:text-white"
                aria-label="Close face to face"
              >
                ×
              </button>
            </div>

            <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.16),_rgba(10,15,25,0.7)_42%,_rgba(0,0,0,0.86)_100%)] p-8">
              {runtimeAvatar ? (
                <div className="h-[min(78vh,680px)] w-[min(78vh,680px)]">
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
                <div className="max-w-md rounded-[30px] border border-amber-400/20 bg-amber-500/10 p-8 text-center">
                  <div className="text-sm font-semibold text-amber-100">
                    No prepared avatar pack
                  </div>
                  <div className="mt-3 text-sm leading-6 text-amber-100/65">
                    Go to AI Management → Animation, select the avatar you want,
                    and prepare the avatar pack. The chat refreshes the active
                    avatar automatically while open.
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-6 left-1/2 z-20 w-[min(680px,calc(100%-48px))] -translate-x-1/2">
              <div className="rounded-[28px] border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur-xl">
                <div className="min-h-[24px] text-center text-sm leading-6 text-white/70">
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
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-semibold text-slate-950 transition-all duration-300 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Start face to face listening"
                  >
                    ●
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
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-lg text-white/70 transition-all duration-300 hover:border-white/20 hover:text-white"
                    aria-label="Pause face to face"
                  >
                    ■
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
        className="fixed bottom-6 right-6 z-[101] flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white text-slate-950 shadow-2xl shadow-black/40 transition-all duration-300 hover:scale-105 hover:bg-cyan-100"
        aria-label="Open AI Assistant"
      >
        <span className="text-lg font-semibold">AI</span>
      </button>
    </>
  );
}
