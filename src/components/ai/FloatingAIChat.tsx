"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { askAI } from "@/lib/ai/aiRouter";

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

export default function FloatingAIChat() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: createMessageId(),
      role: "assistant",
      content: "Hello. How can I help you?",
    },
  ]);

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
        title: firstPrompt.slice(0, 120),
      },
    });

    return nextSessionId;
  }

  async function saveConversationMessage({
    activeSessionId,
    message,
  }: {
    activeSessionId: string | null;
    message: Message;
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
      metadata: {},
    });

    if (error) {
      console.error("AI message save error:", error);
    }
  }

  async function handleSend() {
    const cleanInput = input.trim();
    if (!cleanInput || loading) return;

    const activeSessionId = await getOrCreateSession(cleanInput);

    const userMessage: Message = {
      id: createMessageId(),
      role: "user",
      content: cleanInput,
    };

    const nextMessages: Message[] = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setProvider("");
    setModel("");

    await saveConversationMessage({
      activeSessionId,
      message: userMessage,
    });

    try {
      const result = await askAI(cleanInput);

      const assistantMessage: Message = {
        id: createMessageId(),
        role: "assistant",
        content: result.text || "No response received.",
        provider: result.provider || "",
        model: result.model || "",
        router_layer: resolveRouterLayer(result.provider, result.debug?.layer) ?? undefined,
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
      });
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

      await saveConversationMessage({
        activeSessionId,
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  async function startNewSession() {
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
    setMessages([
      {
        id: createMessageId(),
        role: "assistant",
        content: "Hello. How can I help you?",
      },
    ]);
  }

  async function updateFeedback(message: Message, feedback: "liked" | "disliked") {
    if (!sessionId || message.role !== "assistant") return;

    setMessages((current) =>
      current.map((item) =>
        item.id === message.id ? { ...item, feedback } : item
      )
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

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-[100] flex h-[640px] w-[380px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#060b16]/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="space-y-1">
              <div className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-cyan-200">
                AI Assistant
              </div>
              <div className="text-sm font-semibold text-white">Floating AI</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => void startNewSession()}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition-all duration-300 hover:border-white/20 hover:text-white"
              >
                New
              </button>

              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition-all duration-300 hover:border-white/20 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-cyan-500 text-slate-950"
                      : "border border-white/10 bg-white/[0.045] text-white/85"
                  }`}
                >
                  {message.content}

                  {message.role === "assistant" && message.provider && (
                    <div className="mt-2 text-[10px] text-white/40">
                      {message.provider}
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
                <div className="max-w-[85%] rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white/60">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 px-4 py-4">
            {(provider || model) && (
              <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white/60">
                Provider: <span className="text-white/85">{provider || "-"}</span>
                {" · "}
                Model: <span className="text-white/85">{model || "-"}</span>
              </div>
            )}

            <div className="space-y-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-white/30 focus:border-cyan-400/40"
              />

              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-medium text-slate-950 transition-all duration-300 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Thinking..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-[101] flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500 text-slate-950 shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-cyan-400"
        aria-label="Open AI Assistant"
      >
        <span className="text-xl font-semibold">AI</span>
      </button>
    </>
  );
}
