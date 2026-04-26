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

type ChatMode = "text" | "speech_to_text" | "face_to_face";

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
  bucket_id: string;
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
  const [interimTranscript, setInterimTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
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
      content: "Hello. I am connected to the AiXia AI system. How can I help you?",
    },
  ]);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const modeRef = useRef<ChatMode>("text");
  const openRef = useRef(false);
  const loadingRef = useRef(false);

  const speechSupported = useMemo(
    () => Boolean(getSpeechRecognitionConstructor()),
    []
  );

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
      stopListening();
      stopVoiceOutput();
    };
  }, []);

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
    setInterimTranscript("");
    setLoading(true);
    setProvider("");
    setModel("");
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
      setProvider(result.provider || "");
      setModel(result.model || "");

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

  function setTextMode() {
    stopListening();
    stopVoiceOutput();
    setMode("text");
    setAvatarState("idle");
    setStatusMessage("");
  }

  function toggleSpeechToTextMode() {
    stopVoiceOutput();

    if (mode === "speech_to_text" && listening) {
      stopListening();
      setMode("text");
      return;
    }

    setMode("speech_to_text");
    void startListening("speech_to_text");
  }

  function toggleFaceToFaceMode() {
    if (mode === "face_to_face") {
      stopListening();
      stopVoiceOutput();
      setMode("text");
      setAvatarState("idle");
      setStatusMessage("");
      return;
    }

    setMode("face_to_face");
    setAvatarState("listening");
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

    stopListening();

    const RecognitionConstructor = getSpeechRecognitionConstructor();
    if (!RecognitionConstructor) return;

    const recognition = new RecognitionConstructor();
    recognition.continuous = nextMode === "face_to_face";
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
      }

      const cleanFinalTranscript = finalTranscript.trim();

      if (!cleanFinalTranscript) return;

      setInterimTranscript("");

      if (modeRef.current === "face_to_face") {
        stopListening();
        void handleSend(cleanFinalTranscript, "face_to_face");
      } else {
        setInput((current) =>
          `${current}${current.trim() ? " " : ""}${cleanFinalTranscript}`.trim()
        );
      }
    };

    recognition.onerror = (event) => {
      setListening(false);
      setStatusMessage(`Microphone error: ${event.error}`);
      setAvatarState("error");
    };

    recognition.onend = () => {
      setListening(false);

      if (modeRef.current === "face_to_face" && !loadingRef.current) {
        setAvatarState("idle");
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
      setStatusMessage(
        nextMode === "face_to_face"
          ? "Face-to-face mode is listening."
          : "Microphone is listening. Speak and your text will appear in the box."
      );
      setAvatarState(nextMode === "face_to_face" ? "listening" : "idle");
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
      setStatusMessage("Text response received. Browser speech output is unavailable.");
      return;
    }

    if (!voiceSettings.voice_tts_enabled) {
      setAvatarState("idle");
      setStatusMessage("Text response received. TTS is disabled in AI Management → Voice.");
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
      setStatusMessage("AiXia is speaking.");
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

  async function startNewSession() {
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
    }

    setSessionId(null);
    setProvider("");
    setModel("");
    setInput("");
    setInterimTranscript("");
    setMode("text");
    setAvatarState("idle");
    setStatusMessage("");
    setMessages([
      {
        id: createMessageId(),
        role: "assistant",
        content:
          "New AiXia chat started. I am ready in text mode by default.",
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

  const modeLabel =
    mode === "face_to_face"
      ? "Face to Face"
      : mode === "speech_to_text"
        ? "Speech to Text"
        : "Text Chat";

  const canUseFaceToFace =
    voiceSettings.voice_enabled &&
    voiceSettings.voice_stt_enabled &&
    voiceSettings.voice_tts_enabled &&
    runtimeAvatar;

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-[100] flex h-[720px] w-[430px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#050914]/95 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl">
          <div className="border-b border-white/10 bg-white/[0.025] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-cyan-200">
                  AiXia Assistant
                </div>
                <div>
                  <div className="text-base font-semibold text-white">
                    Controlled Chat Interface
                  </div>
                  <div className="mt-1 text-xs leading-5 text-white/50">
                    Mode: <span className="text-cyan-200">{modeLabel}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void startNewSession()}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition-all duration-300 hover:border-white/20 hover:text-white"
                >
                  New
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopListening();
                    stopVoiceOutput();
                    setOpen(false);
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition-all duration-300 hover:border-white/20 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={setTextMode}
                className={`rounded-2xl border px-3 py-2 text-xs transition-all duration-300 ${
                  mode === "text"
                    ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                    : "border-white/10 bg-white/[0.035] text-white/55 hover:border-white/20 hover:text-white"
                }`}
              >
                Text
              </button>

              <button
                type="button"
                onClick={toggleSpeechToTextMode}
                className={`rounded-2xl border px-3 py-2 text-xs transition-all duration-300 ${
                  mode === "speech_to_text"
                    ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                    : "border-white/10 bg-white/[0.035] text-white/55 hover:border-white/20 hover:text-white"
                }`}
              >
                {listening && mode === "speech_to_text" ? "Stop Mic" : "Mic"}
              </button>

              <button
                type="button"
                onClick={toggleFaceToFaceMode}
                className={`rounded-2xl border px-3 py-2 text-xs transition-all duration-300 ${
                  mode === "face_to_face"
                    ? "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100"
                    : "border-white/10 bg-white/[0.035] text-white/55 hover:border-white/20 hover:text-white"
                }`}
              >
                Face to Face
              </button>
            </div>
          </div>

          {mode === "face_to_face" && (
            <div className="border-b border-white/10 bg-black/15 px-5 py-4">
              <div className="h-[230px] overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_rgba(15,23,42,0.42)_45%,_rgba(0,0,0,0.24))]">
                {runtimeAvatar ? (
                  <AvatarPackRuntime
                    asset={runtimeAvatar}
                    state={avatarState}
                    lipSyncEnabled={
                      animationSettings.lipSyncEnabled &&
                      animationSettings.voiceReactiveEnabled
                    }
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                    <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-amber-200">
                      Avatar Pack Required
                    </div>
                    <div className="mt-3 text-sm font-semibold text-white">
                      Prepare an avatar pack first
                    </div>
                    <div className="mt-2 text-xs leading-5 text-white/45">
                      Go to AI Management → Animation, upload an avatar image,
                      and click Prepare Avatar Pack.
                    </div>
                  </div>
                )}
              </div>

              {!canUseFaceToFace && (
                <div className="mt-3 rounded-2xl border border-amber-400/15 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100/80">
                  Face-to-face mode needs Voice enabled, STT enabled, TTS enabled,
                  and a prepared active avatar pack.
                </div>
              )}
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/25"
                      : "border border-white/10 bg-white/[0.045] text-white/85"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>

                  {message.role === "assistant" && message.provider && (
                    <div className="mt-2 border-t border-white/10 pt-2 text-[10px] text-white/40">
                      {message.provider}
                      {message.model ? ` · ${message.model}` : ""}
                      {message.router_layer ? ` · ${message.router_layer}` : ""}
                    </div>
                  )}

                  {message.role === "assistant" && message.id !== messages[0]?.id && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void updateFeedback(message, "liked")}
                        disabled={message.feedback === "liked"}
                        className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300 disabled:opacity-50"
                      >
                        Like
                      </button>

                      <button
                        type="button"
                        onClick={() => void updateFeedback(message, "disliked")}
                        disabled={message.feedback === "disliked"}
                        className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-300 disabled:opacity-50"
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
                <div className="max-w-[86%] rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white/60">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-white/[0.025] px-4 py-4">
            {(provider || model || statusMessage || interimTranscript) && (
              <div className="mb-3 space-y-2">
                {(provider || model) && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white/60">
                    Provider:{" "}
                    <span className="text-white/85">{provider || "-"}</span>
                    {" · "}
                    Model: <span className="text-white/85">{model || "-"}</span>
                  </div>
                )}

                {(statusMessage || interimTranscript) && (
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-3 py-2 text-[11px] leading-5 text-cyan-100/80">
                    {interimTranscript || statusMessage}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={
                  mode === "face_to_face"
                    ? "Speak or type here..."
                    : "Type your question..."
                }
                className="min-h-[96px] w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 text-white outline-none transition-all duration-300 placeholder:text-white/30 focus:border-cyan-400/40"
              />

              <div className="grid grid-cols-[44px_1fr] gap-3">
                <button
                  type="button"
                  onClick={toggleSpeechToTextMode}
                  disabled={!speechSupported || loading}
                  className={`rounded-2xl border text-sm transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                    listening
                      ? "border-rose-400/30 bg-rose-500/15 text-rose-200"
                      : "border-white/10 bg-white/[0.04] text-white/70 hover:border-cyan-400/30 hover:text-cyan-100"
                  }`}
                  aria-label="Toggle microphone"
                >
                  {listening ? "■" : "🎙"}
                </button>

                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={loading || !input.trim()}
                  className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition-all duration-300 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Thinking..." : "Send"}
                </button>
              </div>

              <div className="text-center text-[10px] text-white/35">
                Press Enter to send · Shift + Enter for a new line
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
        className="fixed bottom-6 right-6 z-[101] flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500 text-slate-950 shadow-2xl shadow-cyan-950/30 transition-all duration-300 hover:scale-105 hover:bg-cyan-400"
        aria-label="Open AI Assistant"
      >
        <span className="text-xl font-semibold">AI</span>
      </button>
    </>
  );
}
