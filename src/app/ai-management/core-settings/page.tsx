import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Brain,
  Database,
  Gauge,
  RefreshCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type SettingKey =
  | "semantic_threshold"
  | "cache_enabled"
  | "semantic_enabled"
  | "openai_enabled"
  | "auto_learning_enabled"
  | "min_cache_confidence"
  | "min_openai_length"
  | "openai_temperature"
  | "openai_max_tokens"
  | "response_mode"
  | "knowledge_strictness"
  | "blocked_topics"
  | "allowed_topics"
  | "force_refusal"
  | "response_tone";

type AISettings = {
  semantic_threshold: number;
  cache_enabled: boolean;
  semantic_enabled: boolean;
  openai_enabled: boolean;
  auto_learning_enabled: boolean;
  min_cache_confidence: number;
  min_openai_length: number;
  openai_temperature: number;
  openai_max_tokens: number;
  response_mode: string;
  knowledge_strictness: string;
  blocked_topics: string[];
  allowed_topics: string[];
  force_refusal: boolean;
  response_tone: string;
};

const defaultSettings: AISettings = {
  semantic_threshold: 0.8,
  cache_enabled: true,
  semantic_enabled: true,
  openai_enabled: true,
  auto_learning_enabled: true,
  min_cache_confidence: 0.8,
  min_openai_length: 80,
  openai_temperature: 0.2,
  openai_max_tokens: 500,
  response_mode: "balanced",
  knowledge_strictness: "hybrid",
  blocked_topics: [],
  allowed_topics: [],
  force_refusal: false,
  response_tone: "professional",
};

const settingDescriptions: Partial<
  Record<
    SettingKey,
    { title: string; description: string; type: "toggle" | "number" | "select"; min?: number; max?: number; step?: number }
  >
> = {
  cache_enabled: {
    title: "Exact Cache",
    description: "Allow exact saved cache answers before semantic or OpenAI fallback.",
    type: "toggle",
  },
  semantic_enabled: {
    title: "Semantic Cache",
    description: "Allow vector similarity matching when no exact cache answer exists.",
    type: "toggle",
  },
  openai_enabled: {
    title: "OpenAI Fallback",
    description: "Allow OpenAI + knowledge fallback when approved and cache layers do not answer.",
    type: "toggle",
  },
  auto_learning_enabled: {
    title: "Auto Learning",
    description: "Allow high-quality OpenAI + knowledge answers to be saved into cache.",
    type: "toggle",
  },
  semantic_threshold: {
    title: "Semantic Threshold",
    description: "Minimum similarity required before semantic cache is allowed to answer.",
    type: "number",
    min: 0,
    max: 1,
    step: 0.01,
  },
  min_cache_confidence: {
    title: "Cache Promotion Confidence",
    description: "Minimum cache quality score required before automatic promotion can happen.",
    type: "number",
    min: 0,
    max: 1,
    step: 0.01,
  },
  min_openai_length: {
    title: "Minimum OpenAI Answer Length",
    description: "Minimum answer length before OpenAI fallback is considered strong enough.",
    type: "number",
    min: 20,
    max: 500,
    step: 1,
  },
  openai_temperature: {
    title: "OpenAI Temperature",
    description: "Controls creativity (0 = strict, 1 = creative).",
    type: "number",
    min: 0,
    max: 1,
    step: 0.05,
  },
  openai_max_tokens: {
    title: "Max Tokens",
    description: "Maximum response length from OpenAI.",
    type: "number",
    min: 50,
    max: 2000,
    step: 10,
  },
  response_mode: {
    title: "Response Mode",
    description: "Controls how direct or expressive OpenAI fallback responses should be.",
    type: "select",
  },
  knowledge_strictness: {
    title: "Knowledge Strictness",
    description: "Controls how tightly OpenAI fallback must stay inside approved knowledge.",
    type: "select",
  },
};

function formatSettingValue(value: number | boolean | string | string[]) {
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export default function AICoreSettingsPage() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [blockedTopicsText, setBlockedTopicsText] = useState("");
  const [allowedTopicsText, setAllowedTopicsText] = useState("");

  const enabledCount = useMemo(
    () =>
      [
        settings.cache_enabled,
        settings.semantic_enabled,
        settings.openai_enabled,
        settings.auto_learning_enabled,
      ].filter(Boolean).length,
    [settings]
  );

    const safetyMode = useMemo(() => {
    const semanticThreshold = Number(settings.semantic_threshold);
    const minOpenAiLength = Number(settings.min_openai_length);

    if (!settings.openai_enabled) return "Closed";
    if (semanticThreshold >= 0.8 && minOpenAiLength >= 80) return "Controlled";
    return "Flexible";
  }, [settings]);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    const { data, error } = await supabase
      .from("ai_settings")
      .select("setting_key, setting_value");

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const nextSettings = { ...defaultSettings };

    for (const row of data ?? []) {
      const key = row.setting_key as SettingKey;

            if (key in nextSettings) {
        (nextSettings as Record<string, unknown>)[key] =
          row.setting_value?.value ?? nextSettings[key];
      }
    }

        setSettings(nextSettings);
    setBlockedTopicsText(nextSettings.blocked_topics.join(", "));
    setAllowedTopicsText(nextSettings.allowed_topics.join(", "));
    setLoading(false);
  }

     async function saveSettings() {
    setSaving(true);
    setErrorMessage(null);
    setActionMessage(null);

    const settingsToSave: AISettings = {
      ...settings,
      blocked_topics: blockedTopicsText
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      allowed_topics: allowedTopicsText
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    };

    for (const key of Object.keys(settingsToSave) as SettingKey[]) {
      const { data, error } = await supabase
        .from("ai_settings")
        .update({
          setting_value: { value: settingsToSave[key] },
          updated_at: new Date().toISOString(),
        })
        .eq("setting_key", key)
        .select("setting_key")
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }

      if (!data) {
        setErrorMessage(`Setting was not saved: ${key}`);
        setSaving(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from("ai_settings")
      .select("setting_key, setting_value");

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    const nextSettings = { ...defaultSettings };

    for (const row of data ?? []) {
      const key = row.setting_key as SettingKey;

      if (key in nextSettings) {
        (nextSettings as Record<string, unknown>)[key] =
          row.setting_value?.value ?? nextSettings[key];
      }
    }

    setSettings(nextSettings);
    setBlockedTopicsText(nextSettings.blocked_topics.join(", "));
    setAllowedTopicsText(nextSettings.allowed_topics.join(", "));
    setActionMessage("Saved successfully. Settings are now stored in the database.");
    setSaving(false);
  }

     function updateSetting(
    key: SettingKey,
    value: number | boolean | string | string[]
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-6 py-6 text-white">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
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
                  <Gauge className="h-3.5 w-3.5" />
                  Runtime Control Layer
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                    Core AI Settings
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Control the live AI router behavior without changing code. Approved answers still remain the top authority layer.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[540px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Enabled Layers
                </p>
                <p className="mt-2 text-3xl font-semibold text-emerald-200">
                  {enabledCount}/4
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Safety Mode
                </p>
                <p className="mt-2 text-3xl font-semibold text-cyan-200">
                  {safetyMode}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Semantic Gate
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {settings.semantic_threshold}
                </p>
              </div>
            </div>
          </div>
        </header>

        {(errorMessage || actionMessage) && (
          <div className="space-y-2">
            {errorMessage && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {errorMessage}
              </div>
            )}

            {actionMessage && (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {actionMessage}
              </div>
            )}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Runtime Settings
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  These values are read by the ai-router Edge Function.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadSettings()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            <div className="divide-y divide-white/5">
              {(Object.keys(settingDescriptions) as SettingKey[]).map((key) => {
                const definition = settingDescriptions[key];
                const value = settings[key];

                if (!definition) {
                  return null;
                }

                return (
                  <div key={key} className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_220px] lg:items-center">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                        {definition.type === "toggle" ? (
                          <ShieldCheck className="h-5 w-5" />
                        ) : (
                          <SlidersHorizontal className="h-5 w-5" />
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-white">
                          {definition.title}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-slate-400">
                          {definition.description}
                        </div>
                        <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-600">
                          {key}
                        </div>
                      </div>
                    </div>

                                        <div>
                      {key === "response_mode" ? (
                        <select
                          value={String(value)}
                          onChange={(e) => updateSetting(key, e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white"
                        >
                          <option value="strict">Strict</option>
                          <option value="balanced">Balanced</option>
                          <option value="creative">Creative</option>
                        </select>
                      ) : key === "knowledge_strictness" ? (
                        <select
                          value={String(value)}
                          onChange={(e) => updateSetting(key, e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white"
                        >
                          <option value="strict">Strict</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="open">Open</option>
                        </select>
                      ) : definition.type === "toggle" ? (
                        <button
                          type="button"
                          onClick={() => updateSetting(key, !Boolean(value))}
                          className={`inline-flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                            value
                              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                              : "border-rose-400/20 bg-rose-500/10 text-rose-200"
                          }`}
                        >
                          {formatSettingValue(value)}
                          {value ? (
                            <ToggleRight className="h-5 w-5" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </button>
                      ) : (
                        <input
                          type="number"
                          min={definition.min}
                          max={definition.max}
                          step={definition.step}
                          value={Number(value)}
                          onChange={(event) =>
                            updateSetting(key, Number(event.target.value))
                          }
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Brain className="h-4 w-4" />
                Router Order
              </div>

              <div className="mt-4 space-y-3">
                {[
                  "Approved Answers",
                  "Exact Cache",
                  "Semantic Cache",
                  "OpenAI + Knowledge",
                ].map((layer, index) => (
                  <div
                    key={layer}
                    className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3"
                  >
                    <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/70">
                      Step {index}
                    </div>
                    <div className="mt-1 text-sm font-medium text-white">
                      {layer}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Database className="h-4 w-4" />
                Current Runtime Snapshot
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <SnapshotRow label="Cache" value={formatSettingValue(settings.cache_enabled)} />
                <SnapshotRow label="Semantic" value={formatSettingValue(settings.semantic_enabled)} />
                <SnapshotRow label="OpenAI Fallback" value={formatSettingValue(settings.openai_enabled)} />
                <SnapshotRow label="Auto Learning" value={formatSettingValue(settings.auto_learning_enabled)} />
                <SnapshotRow label="Semantic Threshold" value={String(settings.semantic_threshold)} />
                <SnapshotRow label="Temperature" value={String(settings.openai_temperature)} />
                <SnapshotRow label="Max Tokens" value={String(settings.openai_max_tokens)} />
                <SnapshotRow label="Response Mode" value={String(settings.response_mode)} />
                <SnapshotRow label="Knowledge Strictness" value={String(settings.knowledge_strictness)} />
              </div>
            </div>

                       <div className="space-y-3">
              <button
                type="button"
                onClick={() => void saveSettings()}
                disabled={saving || loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Core Settings"}
              </button>

              {actionMessage && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-center text-sm font-semibold text-emerald-200">
                  {actionMessage}
                </div>
              )}
            </div>

                        <div className="rounded-[28px] border border-red-400/20 bg-red-500/10 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
                <ShieldCheck className="h-4 w-4" />
                AI Guardrails
              </div>

              <div className="mt-4 space-y-4">

                <div>
                  <label className="text-xs text-slate-400">Blocked Topics (comma separated)</label>
                                   <input
                    value={blockedTopicsText}
                    onChange={(e) => setBlockedTopicsText(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">Allowed Topics (comma separated)</label>
                                   <input
                    value={allowedTopicsText}
                    onChange={(e) => setAllowedTopicsText(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">Force Refusal</span>
                  <button
                    onClick={() => updateSetting("force_refusal", !settings.force_refusal)}
                    className={`px-4 py-2 rounded-xl ${
                      settings.force_refusal ? "bg-red-500/20 text-red-200" : "bg-white/10"
                    }`}
                  >
                    {settings.force_refusal ? "ON" : "OFF"}
                  </button>
                </div>

                <div>
                  <label className="text-xs text-slate-400">Response Tone</label>
                  <select
                    value={settings.response_tone}
                    onChange={(e) => updateSetting("response_tone", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  >
                    <option value="professional">Professional</option>
                    <option value="strict">Strict</option>
                    <option value="friendly">Friendly</option>
                  </select>
                </div>

              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
