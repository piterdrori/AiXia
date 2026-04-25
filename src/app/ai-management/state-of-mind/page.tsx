import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Brain,
  RefreshCcw,
  Save,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type StateSettings = {
  state_enabled: boolean;
  state_mode: string;
  state_calm_alert: number;
  state_supportive_neutral: number;
  state_strict_flexible: number;
  state_exploratory_conservative: number;
  state_concise_detailed: number;
  state_diagnostic_reactive: number;
  state_notes: string;
};

type StateKey = keyof StateSettings;

type SliderConfig = {
  key: StateKey;
  title: string;
  lowLabel: string;
  highLabel: string;
  description: string;
};

type ModeConfig = {
  value: string;
  label: string;
  description: string;
};

const defaultStateSettings: StateSettings = {
  state_enabled: false,
  state_mode: "normal",
  state_calm_alert: 45,
  state_supportive_neutral: 55,
  state_strict_flexible: 65,
  state_exploratory_conservative: 45,
  state_concise_detailed: 50,
  state_diagnostic_reactive: 60,
  state_notes: "",
};

const stateKeys = Object.keys(defaultStateSettings) as StateKey[];

const stateModes: ModeConfig[] = [
  {
    value: "normal",
    label: "Normal",
    description: "Balanced default operating posture.",
  },
  {
    value: "focused",
    label: "Focused",
    description: "Short, direct, task-oriented responses.",
  },
  {
    value: "careful",
    label: "Careful",
    description: "Cautious, verification-first behavior.",
  },
  {
    value: "strict",
    label: "Strict",
    description: "Rule-heavy behavior with tighter refusal posture.",
  },
  {
    value: "supportive",
    label: "Supportive",
    description: "Warmer and more encouraging response posture.",
  },
  {
    value: "creative",
    label: "Creative",
    description: "Broader ideas and more suggestions while staying accurate.",
  },
  {
    value: "diagnostic",
    label: "Diagnostic",
    description: "Root-cause investigation and deeper analysis.",
  },
  {
    value: "crisis",
    label: "Crisis",
    description: "Urgency-first, direct, safety-aware behavior.",
  },
];

const stateSliders: SliderConfig[] = [
  {
    key: "state_calm_alert",
    title: "Calm / Alert",
    lowLabel: "Calm",
    highLabel: "Alert",
    description: "Controls urgency and alertness in responses.",
  },
  {
    key: "state_supportive_neutral",
    title: "Neutral / Supportive",
    lowLabel: "Neutral",
    highLabel: "Supportive",
    description: "Controls warmth and encouragement.",
  },
  {
    key: "state_strict_flexible",
    title: "Flexible / Strict",
    lowLabel: "Flexible",
    highLabel: "Strict",
    description: "Controls how strongly the assistant follows rules in the moment.",
  },
  {
    key: "state_exploratory_conservative",
    title: "Conservative / Exploratory",
    lowLabel: "Conservative",
    highLabel: "Exploratory",
    description: "Controls whether the assistant suggests broader paths.",
  },
  {
    key: "state_concise_detailed",
    title: "Concise / Detailed",
    lowLabel: "Concise",
    highLabel: "Detailed",
    description: "Controls answer length as a temporary overlay.",
  },
  {
    key: "state_diagnostic_reactive",
    title: "Reactive / Diagnostic",
    lowLabel: "Reactive",
    highLabel: "Diagnostic",
    description: "Controls whether the assistant simply answers or investigates root cause.",
  },
];

function getNumberValue(value: string | number | boolean) {
  if (typeof value === "boolean") return value ? 100 : 0;
  return typeof value === "number" ? value : Number(value);
}

function getSliderValue(settings: StateSettings, key: StateKey) {
  const value = settings[key];
  return typeof value === "number" ? value : 0;
}

function getCurrentMode(settings: StateSettings) {
  return (
    stateModes.find((mode) => mode.value === settings.state_mode) ??
    stateModes[0]
  );
}

export default function AIStateOfMindPage() {
  const navigate = useNavigate();

  const [settings, setSettings] =
    useState<StateSettings>(defaultStateSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const currentMode = useMemo(() => getCurrentMode(settings), [settings]);

  const stateIntensity = useMemo(() => {
    const total = stateSliders.reduce(
      (sum, slider) => sum + getSliderValue(settings, slider.key),
      0
    );

    return Math.round(total / stateSliders.length);
  }, [settings]);

  const stateLabel = useMemo(() => {
    if (!settings.state_enabled) return "Disabled";
    if (stateIntensity >= 75) return "High Intensity";
    if (stateIntensity >= 45) return "Moderate";
    return "Low Intensity";
  }, [settings.state_enabled, stateIntensity]);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function seedMissingSettings(existingKeys: Set<string>) {
    const missingRows = stateKeys
      .filter((key) => !existingKeys.has(key))
      .map((key) => ({
        setting_key: key,
        setting_value: {
          value: defaultStateSettings[key],
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
        .in("setting_key", stateKeys as string[]);

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
        .in("setting_key", stateKeys as string[]);

      if (refreshedError) {
        throw new Error(refreshedError.message);
      }

      const nextSettings = { ...defaultStateSettings };

      for (const row of refreshedData ?? []) {
        const key = row.setting_key as StateKey;

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
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load state settings."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setErrorMessage(null);
    setActionMessage(null);

    for (const key of stateKeys) {
      const value = settings[key];

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
      action_type: "state_of_mind_updated",
      entity_type: "ai_state_of_mind",
      entity_id: null,
      details: {
        state_enabled: settings.state_enabled,
        state_mode: settings.state_mode,
        state_intensity: stateIntensity,
      },
    });

      setActionMessage("State of Mind settings saved.");
    setSaving(false);
  }

  function updateSetting(key: StateKey, value: string | number | boolean) {
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
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">
                  <Activity className="h-3.5 w-3.5" />
                  Optional Behavior Overlay
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                    State of Mind
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Control the assistant’s temporary operating posture. This is optional and only affects tone, urgency, creativity, caution, and diagnostic depth when enabled.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[620px]">
              <MetricCard
                label="Overlay"
                value={settings.state_enabled ? "ON" : "OFF"}
                tone={settings.state_enabled ? "emerald" : "rose"}
              />
              <MetricCard label="Mode" value={currentMode.label} tone="amber" />
              <MetricCard label="Intensity" value={`${stateIntensity}%`} tone="white" />
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

        <section className="grid gap-4 md:grid-cols-3">
          <PurposeCard
            icon={ToggleRight}
            title="Optional Layer"
            description="When disabled, State of Mind has zero effect on router behavior."
          />

          <PurposeCard
            icon={Brain}
            title="Temporary Posture"
            description="Character is stable. State of Mind is the current operating mood."
          />

          <PurposeCard
            icon={AlertTriangle}
            title="Cannot Override Safety"
            description="It cannot override guardrails, approved answers, knowledge restrictions, or safety rules."
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Runtime Overlay
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Enable or disable State of Mind without deleting settings.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void loadSettings()}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateSetting("state_enabled", !settings.state_enabled)
                    }
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                      settings.state_enabled
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                        : "border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                    }`}
                  >
                    {settings.state_enabled ? (
                      <ToggleRight className="h-4 w-4" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                    {settings.state_enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 p-5">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Operating Mode
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {stateModes.map((mode) => {
                      const active = settings.state_mode === mode.value;

                      return (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => updateSetting("state_mode", mode.value)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            active
                              ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                              : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
                          }`}
                        >
                          <div className="text-sm font-semibold">{mode.label}</div>
                          <div className="mt-2 text-xs leading-5 text-slate-500">
                            {mode.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <div className="border-b border-white/10 px-4 py-3">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Behavioral Axes
                    </h2>
                  </div>

                  <div className="grid gap-5 p-4">
                    {stateSliders.map((slider) => {
                      const value = getSliderValue(settings, slider.key);

                      return (
                        <div
                          key={slider.key}
                          className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-white">
                                {slider.title}
                              </div>
                              <div className="mt-1 text-sm leading-6 text-slate-400">
                                {slider.description}
                              </div>
                            </div>

                            <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-200">
                              {value}
                            </div>
                          </div>

                          <div className="mt-4">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={value}
                              onChange={(event) =>
                                updateSetting(slider.key, getNumberValue(event.target.value))
                              }
                              className="w-full accent-amber-400"
                            />

                            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                              <span>{slider.lowLabel}</span>
                              <span>{slider.highLabel}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

                    <aside className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Overlay Notes
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Optional admin notes for the current AI posture.
                </p>
              </div>

              <div className="grid gap-4 p-5">
                <textarea
                  rows={7}
                  value={settings.state_notes}
                  onChange={(event) =>
                    updateSetting("state_notes", event.target.value)
                  }
                  placeholder="Example: This week the AI should be more diagnostic during finance testing..."
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-sm leading-6 text-white focus:border-amber-400/40 focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => void saveSettings()}
                  disabled={saving || loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-500 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save State of Mind"}
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Sparkles className="h-4 w-4" />
                Current Posture Preview
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-300">
                {settings.state_enabled ? (
                  <>
                    State of Mind is active in <span className="text-amber-200">{currentMode.label}</span>{" "}
                    mode with <span className="text-amber-200">{stateLabel}</span> intensity.
                    The assistant should feel{" "}
                    {settings.state_calm_alert >= 70 ? "alert" : settings.state_calm_alert <= 35 ? "calm" : "balanced"},{" "}
                    {settings.state_supportive_neutral >= 70 ? "supportive" : settings.state_supportive_neutral <= 35 ? "neutral" : "professionally warm"},{" "}
                    {settings.state_strict_flexible >= 70 ? "strict" : settings.state_strict_flexible <= 35 ? "flexible" : "balanced"}, and{" "}
                    {settings.state_diagnostic_reactive >= 70 ? "diagnostic" : settings.state_diagnostic_reactive <= 35 ? "reactive" : "moderately analytical"}.
                  </>
                ) : (
                  <>
                    State of Mind is disabled. The router should ignore this overlay completely and rely on Character / Identity, Core Settings, Guardrails, Approved Answers, and Knowledge rules.
                  </>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <AlertTriangle className="h-4 w-4" />
                Overlay Rules
              </div>

              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  OFF means zero runtime effect.
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  ON only affects tone, posture, caution, creativity, detail, and diagnostic depth.
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  It cannot override guardrails, approved answers, safety rules, or knowledge restrictions.
                </div>
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
  tone: "emerald" | "rose" | "amber" | "white";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-200"
      : tone === "rose"
        ? "text-rose-200"
        : tone === "amber"
          ? "text-amber-200"
          : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function PurposeCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Brain;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-amber-200">
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
