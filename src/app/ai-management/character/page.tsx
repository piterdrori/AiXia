import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Brain,
  Gauge,
  RefreshCcw,
  Save,
  Shield,
  Sparkles,
  SlidersHorizontal,
  Wand2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type CharacterSettings = {
  ai_name: string;
  ai_role: string;
  ai_mission: string;
  personality_exploration: number;
  personality_detail_level: number;
  personality_assertiveness: number;
  personality_warmth: number;
  personality_emotionality: number;
  behavior_strictness: number;
  execution_focus: number;
  verbosity_level: number;
  confidence_style: string;
  formatting_style: string;
};

const defaultSettings: CharacterSettings = {
  ai_name: "AiXia Assistant",
  ai_role: "Internal enterprise assistant for AiXia platform operations",
  ai_mission:
    "Help users operate AiXia workflows accurately, especially finance, tasks, projects, employees, AI management, and system operations.",
  personality_exploration: 50,
  personality_detail_level: 70,
  personality_assertiveness: 65,
  personality_warmth: 55,
  personality_emotionality: 25,
  behavior_strictness: 75,
  execution_focus: 85,
  verbosity_level: 45,
  confidence_style: "clear",
  formatting_style: "structured",
};

const settingKeys = Object.keys(defaultSettings) as Array<keyof CharacterSettings>;

type SliderConfig = {
  key: keyof CharacterSettings;
  title: string;
  lowLabel: string;
  highLabel: string;
  description: string;
};

const personalitySliders: SliderConfig[] = [
  {
    key: "personality_exploration",
    title: "Exploration",
    lowLabel: "Conservative",
    highLabel: "Exploratory",
    description: "Controls whether the AI stays narrow or suggests broader options.",
  },
  {
    key: "personality_detail_level",
    title: "Detail Level",
    lowLabel: "Concise",
    highLabel: "Detailed",
    description: "Controls how much detail the AI includes by default.",
  },
  {
    key: "personality_assertiveness",
    title: "Assertiveness",
    lowLabel: "Passive",
    highLabel: "Direct",
    description: "Controls how strongly the AI gives recommendations.",
  },
  {
    key: "personality_warmth",
    title: "Warmth",
    lowLabel: "Neutral",
    highLabel: "Supportive",
    description: "Controls how friendly and human the AI feels.",
  },
  {
    key: "personality_emotionality",
    title: "Emotionality",
    lowLabel: "Calm",
    highLabel: "Expressive",
    description: "Controls emotional language. Lower is better for enterprise use.",
  },
];

const behaviorSliders: SliderConfig[] = [
  {
    key: "behavior_strictness",
    title: "Strictness",
    lowLabel: "Flexible",
    highLabel: "Strict",
    description: "Controls how carefully the AI follows rules and approved scope.",
  },
  {
    key: "execution_focus",
    title: "Execution Focus",
    lowLabel: "Explains",
    highLabel: "Executes",
    description: "Controls whether the AI focuses on action steps over theory.",
  },
  {
    key: "verbosity_level",
    title: "Verbosity",
    lowLabel: "Short",
    highLabel: "Long",
    description: "Controls default answer length.",
  },
];

function getNumberValue(value: string | number) {
  return typeof value === "number" ? value : Number(value);
}

function getSliderValue(settings: CharacterSettings, key: keyof CharacterSettings) {
  const value = settings[key];
  return typeof value === "number" ? value : 0;
}

export default function AICharacterPage() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState<CharacterSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const identityCompleteness = useMemo(() => {
    const filled = [settings.ai_name, settings.ai_role, settings.ai_mission].filter(
      (value) => value.trim().length > 0
    ).length;

    return Math.round((filled / 3) * 100);
  }, [settings]);

  const averagePersonality = useMemo(() => {
    const total = personalitySliders.reduce(
      (sum, slider) => sum + getSliderValue(settings, slider.key),
      0
    );

    return Math.round(total / personalitySliders.length);
  }, [settings]);

  const averageBehavior = useMemo(() => {
    const total = behaviorSliders.reduce(
      (sum, slider) => sum + getSliderValue(settings, slider.key),
      0
    );

    return Math.round(total / behaviorSliders.length);
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
      .select("setting_key, setting_value")
      .in("setting_key", settingKeys as string[]);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const nextSettings = { ...defaultSettings };

    for (const row of data ?? []) {
      const key = row.setting_key as keyof CharacterSettings;

      if (key in nextSettings) {
        const fallbackValue = nextSettings[key];
        const savedValue = row.setting_value?.value ?? fallbackValue;

        (nextSettings as Record<string, string | number>)[key] =
          typeof fallbackValue === "number" ? Number(savedValue) : String(savedValue);
      }
    }

    setSettings(nextSettings);
    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);
    setErrorMessage(null);
    setActionMessage(null);

    for (const key of settingKeys) {
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
      action_type: "character_updated",
      entity_type: "ai_character",
      entity_id: null,
      details: {
        ai_name: settings.ai_name,
        ai_role: settings.ai_role,
        confidence_style: settings.confidence_style,
        formatting_style: settings.formatting_style,
        behavior_strictness: settings.behavior_strictness,
        execution_focus: settings.execution_focus,
        verbosity_level: settings.verbosity_level,
      },
    });

    setActionMessage("Character settings saved.");
    setSaving(false);
  }

  function updateTextSetting(key: keyof CharacterSettings, value: string) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateNumberSetting(key: keyof CharacterSettings, value: string) {
    setSettings((current) => ({
      ...current,
      [key]: getNumberValue(value),
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
                  <Wand2 className="h-3.5 w-3.5" />
                  Character Control Layer
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                    Character / Identity
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Define the AI identity, mission, communication personality, and execution behavior.
                    Memory collects sessions. Approved Answers control exact Q&A. This page controls general behavior.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[620px]">
              <MetricCard label="Identity" value={`${identityCompleteness}%`} />
              <MetricCard label="Personality" value={`${averagePersonality}%`} />
              <MetricCard label="Behavior" value={`${averageBehavior}%`} />
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
            icon={Brain}
            title="Identity"
            description="Name, role, and mission. This tells the router who the assistant is."
          />

          <PurposeCard
            icon={SlidersHorizontal}
            title="Personality"
            description="Enterprise-safe behavior scales inspired by personality controls."
          />

          <PurposeCard
            icon={Shield}
            title="Execution Behavior"
            description="Strictness, action focus, confidence style, and output formatting."
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Identity Foundation
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    The stable definition of who the AI is and what it should do.
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

              <div className="grid gap-4 p-5">
                <TextField
                  label="AI Name"
                  value={settings.ai_name}
                  placeholder="AiXia Assistant"
                  onChange={(value) => updateTextSetting("ai_name", value)}
                />

                <TextField
                  label="AI Role"
                  value={settings.ai_role}
                  placeholder="Internal enterprise assistant"
                  onChange={(value) => updateTextSetting("ai_role", value)}
                />

                <TextAreaField
                  label="AI Mission"
                  value={settings.ai_mission}
                  placeholder="Describe what the assistant should help with..."
                  onChange={(value) => updateTextSetting("ai_mission", value)}
                />
              </div>
            </div>

            <SliderPanel
              title="Personality Sliders"
              description="General communication behavior. These are not exact answers and not session memory."
              sliders={personalitySliders}
              settings={settings}
              onChange={updateNumberSetting}
            />

            <SliderPanel
              title="Execution Behavior"
              description="Operational behavior for business workflows and admin execution."
              sliders={behaviorSliders}
              settings={settings}
              onChange={updateNumberSetting}
            />
          </div>

          <aside className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Output Style
                </h2>
              </div>

              <div className="grid gap-4 p-5">
                <SelectField
                  label="Confidence Style"
                  value={settings.confidence_style}
                  options={[
                    { value: "careful", label: "Careful" },
                    { value: "clear", label: "Clear" },
                    { value: "assertive", label: "Assertive" },
                  ]}
                  onChange={(value) => updateTextSetting("confidence_style", value)}
                />

                <SelectField
                  label="Formatting Style"
                  value={settings.formatting_style}
                  options={[
                    { value: "plain", label: "Plain" },
                    { value: "structured", label: "Structured" },
                    { value: "step-by-step", label: "Step-by-step" },
                  ]}
                  onChange={(value) => updateTextSetting("formatting_style", value)}
                />

                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 py-3 text-sm leading-6 text-cyan-100/80">
                  This page controls general behavior. It should later feed into the AI router system prompt.
                </div>

                <button
                  type="button"
                  onClick={() => void saveSettings()}
                  disabled={saving || loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Character"}
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Sparkles className="h-4 w-4" />
                Behavior Preview
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-300">
                I am {settings.ai_name}. My role is {settings.ai_role}. I should be{" "}
                {settings.execution_focus >= 75 ? "execution-focused" : "explanatory"},{" "}
                {settings.behavior_strictness >= 70 ? "strict with rules" : "flexible with interpretation"}, and{" "}
                {settings.verbosity_level >= 70 ? "detailed" : settings.verbosity_level <= 35 ? "concise" : "balanced"}.
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
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

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <textarea
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
      />
    </label>
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
      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
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

function SliderPanel({
  title,
  description,
  sliders,
  settings,
  onChange,
}: {
  title: string;
  description: string;
  sliders: SliderConfig[];
  settings: CharacterSettings;
  onChange: (key: keyof CharacterSettings, value: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          {title}
        </h2>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>

      <div className="grid gap-5 p-5">
        {sliders.map((slider) => {
          const value = getSliderValue(settings, slider.key);

          return (
            <div
              key={slider.key}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
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

                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm font-semibold text-cyan-200">
                  {value}
                </div>
              </div>

              <div className="mt-4">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(event) => onChange(slider.key, event.target.value)}
                  className="w-full accent-cyan-400"
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
  );
}
