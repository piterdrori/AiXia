"use client";

import { useState } from "react";
import { askAI } from "@/lib/ai/aiRouter";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function FloatingAIChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello. How can I help you?",
    },
  ]);

  async function handleSend() {
    const cleanInput = input.trim();
    if (!cleanInput || loading) return;

    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content: cleanInput },
    ];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setProvider("");
    setModel("");

    try {
      const result = await askAI(cleanInput);

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: result.text || "No response received.",
        },
      ]);

      setProvider(result.provider || "");
      setModel(result.model || "");
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            error instanceof Error ? error.message : "AI request failed.",
        },
      ]);
    } finally {
      setLoading(false);
    }
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

            <button
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition-all duration-300 hover:border-white/20 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
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
