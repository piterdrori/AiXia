"use client";

import { useState } from "react";
import { askAI } from "@/lib/ai/aiRouter";

export default function AIPage() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAsk() {
    const cleanInput = input.trim();
    if (!cleanInput || loading) return;

    setLoading(true);
    setResponse("Thinking...");
    setProvider("");
    setModel("");

    try {
      const result = await askAI(cleanInput);
      setResponse(result.text || "No response received.");
      setProvider(result.provider || "");
      setModel(result.model || "");
    } catch (error) {
      setResponse(
        error instanceof Error ? error.message : "AI request failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-5">
            <div className="space-y-2">
              <div className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
                AI Workspace
              </div>

              <h1 className="text-2xl font-semibold tracking-tight">
                AI Assistant
              </h1>

              <p className="max-w-2xl text-sm text-white/60">
                Ask a question and the system will route the request through the
                configured AI providers.
              </p>
            </div>
          </div>

          <div className="space-y-5 px-6 py-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">
                Your message
              </label>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-white/30 focus:border-cyan-400/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleAsk}
                disabled={loading || !input.trim()}
                className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-medium text-slate-950 transition-all duration-300 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Thinking..." : "Send to AI"}
              </button>

              {(provider || model) && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/60">
                  Provider: <span className="text-white/85">{provider || "-"}</span>
                  {" · "}
                  Model: <span className="text-white/85">{model || "-"}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-white/80">Response</div>

              <div className="min-h-[220px] rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/85 whitespace-pre-wrap">
                {response || "The AI response will appear here."}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
