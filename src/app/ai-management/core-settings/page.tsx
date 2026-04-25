import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Brain,
  Database,
  Gauge,
  RefreshCcw,
  Save,
  ServerCog,
  ShieldCheck,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type RuntimeSettingKey =
  | "openai_enabled"
  | "openai_model"
  | "openai_temperature"
  | "openai_max_tokens"
  | "cache_enabled"
  | "semantic_enabled"
  | "semantic_threshold"
  | "auto_learning_enabled"
  | "knowledge_refresh_enabled"
  | "knowledge_cache_ttl_minutes"
  | "debug_mode_enabled"
  | "router_logging_enabled";

type CoreRuntimeSettings = {
  openai_enabled: boolean;
  openai_model: string;
  openai_temperature: number;
  openai_max_tokens: number;

  cache_enabled: boolean;
  semantic_enabled: boolean;
  semantic_threshold: number;

  auto_learning_enabled: boolean;
  knowledge_refresh_enabled: boolean;
  knowledge_cache_ttl_minutes: number;

  debug_mode_enabled: boolean;
  router_logging_enabled: boolean;
};

type SettingDefinition = {
  key: RuntimeSettingKey;
  title: string;
  description: string;
  type: "toggle" | "number" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
};

const defaultSettings: CoreRuntimeSettings = {
  openai_enabled: true,
  openai_model: "gpt-4.1-mini",
  openai_temperature: 0.2,
  openai_max_tokens: 500,

  cache_enabled: true,
  semantic_enabled: true,
  semantic_threshold: 0.8,

  auto_learning_enabled: true,
  knowledge_refresh_enabled: true,
  knowledge_cache_ttl_minutes: 5,

  debug_mode_enabled: true,
  router_logging_enabled: true,
};

const runtimeSettingKeys = Object.keys(
  defaultSettings
) as RuntimeSettingKey[];

const providerRuntimeSettings: SettingDefinition[] = [
  {
    key: "openai_enabled",
    title: "OpenAI Fallback",
    description:
      "Allows OpenAI + active knowledge fallback when Approved Answers and Cache do not answer.",
    type: "toggle",
  },
  {
    key: "openai_model",
    title: "OpenAI Model",
    description:
      "The model used by the router fallback path. This is runtime engine configuration only.",
    type: "select",
    options: [
      { value: "gpt-4.1-mini", label: "gpt-4.1-mini" },
      { value: "gpt-4.1", label: "gpt-4.1" },
      { value: "gpt-4o-mini", label: "gpt-4o-mini" },
    ],
  },
  {
    key: "openai_temperature",
    title: "OpenAI Temperature",
    description:
      "Controls generation randomness. Lower is more deterministic. Higher is more flexible.",
    type: "number",
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: "openai_max_tokens",
    title: "OpenAI Max Tokens",
    description:
      "Maximum generated response size from the model. This is not a guardrail.",
    type: "number",
    min: 50,
    max: 4000,
    step: 50,
  },
];

const cacheRuntimeSettings: SettingDefinition[] = [
  {
    key: "cache_enabled",
    title: "Exact Cache",
    description:
      "Allows exact cached answers before semantic cache or OpenAI fallback.",
    type: "toggle",
  },
  {
    key: "semantic_enabled",
    title: "Semantic Cache",
    description:
      "Allows vector similarity matching when no exact cached answer exists.",
    type: "toggle",
  },
  {
    key: "semantic_threshold",
    title: "Semantic Threshold",
    description:
      "Minimum similarity score required before semantic cache can answer.",
    type: "number",
    min: 0,
    max: 1,
    step: 0.01,
  },
];

const learningRuntimeSettings: SettingDefinition[] = [
  {
    key: "auto_learning_enabled",
    title: "Auto-Learning",
    description:
      "Allows router-generated answers to be saved into cache when guardrails permit it.",
    type: "toggle",
  },
  {
    key: "knowledge_refresh_enabled",
    title: "Knowledge Refresh",
    description:
      "Allows the router to refresh GitHub/static knowledge instead of only using warm cache.",
    type: "toggle",
  },
  {
    key: "knowledge_cache_ttl_minutes",
    title: "Knowledge Cache TTL",
    description:
      "How long static knowledge should stay cached before refresh is allowed.",
    type: "number",
    min: 1,
    max: 120,
    step: 1,
  },
];

const diagnosticsRuntimeSettings: SettingDefinition[] = [
  {
    key: "debug_mode_enabled",
    title: "Debug Mode",
    description:
      "Allows router debug metadata to return to the AI Studio preview console.",
    type: "toggle",
  },
  {
    key: "router_logging_enabled",
    title: "Router Logging",
    description:
      "Allows router activity logs to be written for audits and troubleshooting.",
    type: "toggle",
  },
];

function formatSettingValue(value: number | boolean | string) {
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  return String(value);
}

function normalizeSettingValue(
  key: RuntimeSettingKey,
  value: unknown
): string | boolean | number {
  const fallback = defaultSettings[key];

  if (typeof fallback === "boolean") {
    return Boolean(value);
  }

  if (typeof fallback === "number") {
    return Number(value ?? fallback);
  }

  return String(value ?? fallback);
}

function getNumberValue(value: string | number | boolean) {
  if (typeof value === "boolean") return value ? 1 : 0;
  return typeof value === "number" ? value : Number(value);
}

export default function AICoreSettingsPage() {
  const navigate = useNavigate();

  const [settings, setSettings] =
    useState<CoreRuntimeSettings>(defaultSettings);
  const settingsRef = useRef<CoreRuntimeSettings>(defaultSettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const enabledCount = useMemo(
    () =>
      [
        settings.openai_enabled,
        settings.cache_enabled,
        settings.semantic_enabled,
        settings.auto_learning_enabled,
        settings.knowledge_refresh_enabled,
        settings.debug_mode_enabled,
        settings.router_logging_enabled,
      ].filter(Boolean).length,
    [settings]
  );

  const runtimeMode = useMemo(() => {
    if (!settings.openai_enabled && !settings.cache_enabled) return "Closed";
    if (settings.cache_enabled && settings.semantic_enabled && settings.openai_enabled) {
      return "Full Runtime";
    }
    if (settings.openai_enabled) return "Fallback Only";
    return "Cache Only";
  }, [settings]);

  const semanticGate = useMemo(() => {
    if (!settings.semantic_enabled) return "Off";
    if (settings.semantic_threshold >= 0.85) return "Strict";
    if (settings.semantic_threshold >= 0.65) return "Balanced";
    return "Flexible";
  }, [settings.semantic_enabled, settings.semantic_threshold]);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function seedMissingSettings(existingKeys: Set<string>) {
    const missingRows = runtimeSettingKeys
      .filter((key) => !existingKeys.has(key))
      .map((key) => ({
        setting_key: key,
        setting_value: {
          value: defaultSettings[key],
        },
      }));

    if (missingRows.length === 0) return;

    const { error } = await supabase.from("ai_settings").insert(missingRows);

    if (error) {
      throw new Error(error.message);
    }
  }

  async function loadSettings() {
    setLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const { data, error } = await supabase
        .from("ai_settings")
        .select("setting_key, setting_value")
        .in("setting_key", runtimeSettingKeys as string[]);

      if (error) {
        throw new Error(error.message);
      }

      const existingKeys = new Set(
        (data ?? []).map((row) => String(row.setting_key))
      );

      await seedMissingSettings(existingKeys);

      const { data: refreshedData, error: refreshedError } = await supabase
        .from("ai_settings")
        .select("setting_key, setting_value")
        .in("setting_key", runtimeSettingKeys as string[]);

      if (refreshedError) {
        throw new Error(refreshedError.message);
      }

      const nextSettings = { ...defaultSettings };

      for (const row of refreshedData ?? []) {
        const key = row.setting_key as RuntimeSettingKey;

        if (key in nextSettings) {
          (nextSettings as Record<string, string | boolean | number>)[key] =
            normalizeSettingValue(key, row.setting_value?.value);
        }
      }

      settingsRef.current = nextSettings;
      setSettings(nextSettings);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load core settings."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateLocalSetting(
    key: RuntimeSettingKey,
    value: string | boolean | number
  ) {
    const nextSettings = {
      ...settingsRef.current,
      [key]: value,
    } as CoreRuntimeSettings;

    settingsRef.current = nextSettings;
    setSettings(nextSettings);
  }

  async function saveAllSettings() {
    setSaving(true);
    setErrorMessage(null);
    setActionMessage(null);

    for (const key of runtimeSettingKeys) {
      const value = settingsRef.current[key];

      const { error } = await supabase.rpc("ai_update_setting", {
        p_setting_key: key,
        p_setting_value: { value },
      });

      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "core_runtime_settings_updated",
      entity_type: "ai_core_settings",
      entity_id: null,
      details: {
        settings_saved: runtimeSettingKeys.length,
        openai_enabled: settingsRef.current.openai_enabled,
        openai_model: settingsRef.current.openai_model,
        cache_enabled: settingsRef.current.cache_enabled,
        semantic_enabled: settingsRef.current.semantic_enabled,
        semantic_threshold: settingsRef.current.semantic_threshold,
        auto_learning_enabled: settingsRef.current.auto_learning_enabled,
        debug_mode_enabled: settingsRef.current.debug_mode_enabled,
        router_logging_enabled: settingsRef.current.router_logging_enabled,
      },
    });

    setActionMessage("Core runtime settings saved.");
    setSaving(false);
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
                  Runtime Engine Layer
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                    Core AI Settings
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Configure only the AI runtime engine: provider, model, cache, semantic matching, learning runtime, and diagnostics. Guardrails, identity, mood, and exact answers live in their own modules.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[620px]">
              <MetricCard label="Runtime" value={runtimeMode} tone="cyan" />
              <MetricCard label="Enabled" value={`${enabledCount}/7`} tone="emerald" />
              <MetricCard label="Semantic" value={semanticGate} tone="white" />
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

        <section className="grid gap-4 md:grid-cols-4">
          <PurposeCard
            icon={ServerCog}
            title="Provider Runtime"
            description="Controls whether OpenAI is available and which model parameters are used."
          />

          <PurposeCard
            icon={Database}
            title="Cache Runtime"
            description="Controls exact cache, semantic cache, and semantic matching threshold."
          />

          <PurposeCard
            icon={Brain}
            title="Learning Runtime"
            description="Controls whether router answers can become reusable cache entries."
          />

          <PurposeCard
            icon={Wrench}
            title="Diagnostics"
            description="Controls runtime debug output and router logging."
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col gap-6">
            <RuntimePanel
              title="Provider Runtime"
              description="Unique to Core Settings. Does not control tone, guardrails, or exact answers."
              settings={providerRuntimeSettings}
              values={settings}
              onChange={updateLocalSetting}
            />

            <RuntimePanel
              title="Cache Runtime"
              description="Controls the cache layers before OpenAI fallback."
              settings={cacheRuntimeSettings}
              values={settings}
              onChange={updateLocalSetting}
            />

            <RuntimePanel
              title="Learning Runtime"
              description="Controls runtime learning and knowledge refresh behavior."
              settings={learningRuntimeSettings}
              values={settings}
              onChange={updateLocalSetting}
            />

            <RuntimePanel
              title="Diagnostics Runtime"
              description="Controls debug metadata and router activity logging."
              settings={diagnosticsRuntimeSettings}
              values={settings}
              onChange={updateLocalSetting}
            />

            <button
              type="button"
              onClick={() => void saveAllSettings()}
              disabled={saving || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Core Runtime Settings"}
            </button>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <ShieldCheck className="h-4 w-4" />
                Module Boundaries
              </div>

              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
                <BoundaryRow label="Character / Identity" value="AI name, role, tone baseline, verbosity." />
                <BoundaryRow label="State of Mind" value="Optional mood and temporary response posture." />
                <BoundaryRow label="Guardrails" value="Allowed topics, blocked topics, weak answer guard, refusals." />
                <BoundaryRow label="Approved Answers" value="Exact controlled Q&A responses." />
                <BoundaryRow label="Knowledge Bank" value="Knowledge items and active source content." />
                <BoundaryRow label="Core Settings" value="Runtime engine only." />
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Database className="h-4 w-4" />
                Runtime Snapshot
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <SnapshotRow label="OpenAI" value={formatSettingValue(settings.openai_enabled)} />
                <SnapshotRow label="Model" value={settings.openai_model} />
                <SnapshotRow label="Temperature" value={String(settings.openai_temperature)} />
                <SnapshotRow label="Max Tokens" value={String(settings.openai_max_tokens)} />
                <SnapshotRow label="Exact Cache" value={formatSettingValue(settings.cache_enabled)} />
                <SnapshotRow label="Semantic Cache" value={formatSettingValue(settings.semantic_enabled)} />
                <SnapshotRow label="Semantic Threshold" value={String(settings.semantic_threshold)} />
                <SnapshotRow label="Auto-Learning" value={formatSettingValue(settings.auto_learning_enabled)} />
                <SnapshotRow label="Knowledge Refresh" value={formatSettingValue(settings.knowledge_refresh_enabled)} />
                <SnapshotRow label="Knowledge TTL" value={`${settings.knowledge_cache_ttl_minutes} min`} />
                <SnapshotRow label="Debug Mode" value={formatSettingValue(settings.debug_mode_enabled)} />
                <SnapshotRow label="Router Logging" value={formatSettingValue(settings.router_logging_enabled)} />
              </div>
            </div>
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
  tone: "cyan" | "emerald" | "white";
}) {
  const toneClass =
    tone === "cyan"
      ? "text-cyan-200"
      : tone === "emerald"
        ? "text-emerald-200"
        : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function PurposeCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Gauge;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function RuntimePanel({
  title,
  description,
  settings,
  values,
  onChange,
}: {
  title: string;
  description: string;
  settings: SettingDefinition[];
  values: CoreRuntimeSettings;
  onChange: (key: RuntimeSettingKey, value: string | boolean | number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          {title}
        </h2>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>

      <div className="divide-y divide-white/5">
        {settings.map((setting) => (
          <RuntimeSettingRow
            key={setting.key}
            setting={setting}
            value={values[setting.key]}
            onChange={(value) => onChange(setting.key, value)}
          />
        ))}
      </div>
    </div>
  );
}

function RuntimeSettingRow({
  setting,
  value,
  onChange,
}: {
  setting: SettingDefinition;
  value: string | boolean | number;
  onChange: (value: string | boolean | number) => void;
}) {
  return (
    <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
          {setting.type === "toggle" ? (
            <ShieldCheck className="h-5 w-5" />
          ) : (
            <SlidersHorizontal className="h-5 w-5" />
          )}
        </div>

        <div>
          <div className="text-sm font-semibold text-white">
            {setting.title}
          </div>
          <div className="mt-1 text-sm leading-6 text-slate-400">
            {setting.description}
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-600">
            {setting.key}
          </div>
        </div>
      </div>

      <div>
        {setting.type === "toggle" ? (
          <button
            type="button"
            onClick={() => onChange(!Boolean(value))}
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
        ) : setting.type === "select" ? (
          <select
            value={String(value)}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
          >
            {(setting.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            min={setting.min}
            max={setting.max}
            step={setting.step}
            value={getNumberValue(value)}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}

function BoundaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
      <div className="text-sm font-semibold text-white">{label}</div>
      <div className="mt-1 text-sm text-slate-500">{value}</div>
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
