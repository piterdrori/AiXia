import { useMemo, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  CircleDot,
  Gauge,
  Lock,
  MonitorPlay,
  Power,
  RefreshCcw,
  Save,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Waves,
  Zap,
} from "lucide-react";

type AnimationEngine = "internal" | "zego";

type AnimationMode = "orb" | "waveform" | "robot" | "hologram" | "mascot";

type AnimationState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "paused"
  | "error";

type AnimationSettings = {
  engine: AnimationEngine;
  zegoEnabled: boolean;
  mode: AnimationMode;
  previewState: AnimationState;
  intensity: number;
  motionSpeed: number;
  glowStrength: number;
  pulseStrength: number;
  showParticles: boolean;
  showWaveform: boolean;
  showStatusText: boolean;
  lipSyncEnabled: boolean;
  voiceReactiveEnabled: boolean;
};

const defaultSettings: AnimationSettings = {
  engine: "internal",
  zegoEnabled: false,
  mode: "orb",
  previewState: "idle",
  intensity: 72,
  motionSpeed: 58,
  glowStrength: 76,
  pulseStrength: 64,
  showParticles: true,
  showWaveform: true,
  showStatusText: true,
  lipSyncEnabled: true,
  voiceReactiveEnabled: true,
};

const internalModes: Array<{
  id: AnimationMode;
  label: string;
  description: string;
}> = [
  {
    id: "orb",
    label: "Orb",
    description: "Premium glowing AiXia orb for clean enterprise experience.",
  },
  {
    id: "waveform",
    label: "Waveform",
    description: "Audio-reactive signal style for voice-first interactions.",
  },
  {
    id: "robot",
    label: "Robot",
    description: "Friendly AiXia robot identity for assistant testing.",
  },
  {
    id: "hologram",
    label: "Hologram",
    description: "Futuristic projection layer for advanced demos.",
  },
  {
    id: "mascot",
    label: "Mascot",
    description: "Brandable character direction for future company UI.",
  },
];

const runtimeStates: Array<{
  id: AnimationState;
  label: string;
  description: string;
}> = [
  {
    id: "idle",
    label: "Idle",
    description: "Assistant is ready and waiting.",
  },
  {
    id: "listening",
    label: "Listening",
    description: "Microphone is active and the user is speaking.",
  },
  {
    id: "thinking",
    label: "Thinking",
    description: "AiXia router is preparing the answer.",
  },
  {
    id: "speaking",
    label: "Speaking",
    description: "AiXia is replying with voice or avatar speech.",
  },
  {
    id: "paused",
    label: "Paused",
    description: "Conversation is paused or inactive.",
  },
  {
    id: "error",
    label: "Error / Disconnected",
    description: "Realtime, avatar, or external provider is disconnected.",
  },
];

function getStateLabel(state: AnimationState) {
  return runtimeStates.find((item) => item.id === state)?.label ?? "Idle";
}

function getStateTone(state: AnimationState) {
  if (state === "listening") return "violet";
  if (state === "thinking") return "amber";
  if (state === "speaking") return "cyan";
  if (state === "paused") return "slate";
  if (state === "error") return "rose";
  return "emerald";
}

export default function AIAnimationPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AnimationSettings>(defaultSettings);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const currentMode = useMemo(
    () => internalModes.find((mode) => mode.id === settings.mode) ?? internalModes[0],
    [settings.mode]
  );

  const activeEngineLabel = settings.zegoEnabled ? "ZEGO Digital Human" : "Internal AiXia";

  function updateSetting<K extends keyof AnimationSettings>(
    key: K,
    value: AnimationSettings[K]
  ) {
    setSavedMessage(null);
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function setZegoEnabled(enabled: boolean) {
    setSavedMessage(null);
    setSettings((current) => ({
      ...current,
      zegoEnabled: enabled,
      engine: enabled ? "zego" : "internal",
    }));
  }

  function resetSettings() {
    setSettings(defaultSettings);
    setSavedMessage("Animation page reset to the default internal AiXia engine.");
  }

  function saveSettings() {
    setSavedMessage(
      "Phase 1 preview saved locally. Backend settings persistence comes in Phase 2."
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-5">
        <header className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => navigate("/ai-management")}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
              >
                <ArrowLeft className="h-4 w-4" />
                AI Studio
              </button>

              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Waves className="h-3.5 w-3.5" />
                  Animation / Avatar
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Animation Studio
                </h1>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Controls the visual assistant layer for AiXia. The internal
                  AiXia animation engine is the default. ZEGO Digital Human is an
                  optional external avatar engine that can be enabled later when
                  API credentials are ready.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[620px]">
              <MetricCard
                icon={MonitorPlay}
                label="Active Engine"
                value={activeEngineLabel}
                tone={settings.zegoEnabled ? "amber" : "cyan"}
              />
              <MetricCard
                icon={CircleDot}
                label="Preview State"
                value={getStateLabel(settings.previewState)}
                tone={getStateTone(settings.previewState)}
              />
              <MetricCard
                icon={Gauge}
                label="Intensity"
                value={`${settings.intensity}%`}
                tone="violet"
              />
            </div>
          </div>
        </header>

        {savedMessage ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {savedMessage}
          </div>
        ) : null}

         <section className="grid gap-5 xl:grid-cols-[minmax(0,720px)_minmax(420px,1fr)] 2xl:grid-cols-[minmax(0,760px)_minmax(520px,1fr)]">
          <div className="self-start overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.20),rgba(2,6,23,0.94)_42%,rgba(2,6,23,0.99))] shadow-2xl shadow-cyan-950/20">
            <div className="border-b border-white/10 px-5 py-4 md:px-6">
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                Phase 1 Foundation
              </div>
              <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white">
                    {settings.zegoEnabled
                      ? "ZEGO Digital Human preview mode"
                      : `${currentMode.label} internal avatar preview`}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    {settings.zegoEnabled
                      ? "ZEGO is enabled in the UI, but the API connection is not active yet. No external API calls are made in Phase 1."
                      : currentMode.description}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[250px]">
                  <button
                    type="button"
                    onClick={resetSettings}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={saveSettings}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    <Save className="h-4 w-4" />
                    Save Preview
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6">
              <AnimationPreview settings={settings} />
            </div>
          </div>

          <aside className="grid content-start gap-5 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <Panel
              eyebrow="Engine"
              title="Avatar Engine"
              description="Internal AiXia is the default. ZEGO can be enabled later as the external digital human engine."
            >
              <div className="grid gap-3">
                <EngineCard
                  selected={!settings.zegoEnabled}
                  icon={Sparkles}
                  label="Internal AiXia Animation Engine"
                  status="Default Active"
                  description="Uses native AiXia visuals, motion controls, uploaded assets later, and basic native lip-sync later."
                  onClick={() => setZegoEnabled(false)}
                />

                <EngineCard
                  selected={settings.zegoEnabled}
                  icon={Zap}
                  label="ZEGO Digital Human"
                  status={settings.zegoEnabled ? "Enabled / Not Connected" : "Off"}
                  description="Optional external 1080P digital human engine. API integration comes later through Supabase Edge Functions."
                  onClick={() => setZegoEnabled(!settings.zegoEnabled)}
                />
              </div>
            </Panel>

           <Panel
              className="lg:col-span-2 xl:col-span-1 2xl:col-span-2"
              eyebrow={settings.zegoEnabled ? "ZEGO Planned" : "Internal Controls"}
              title={
                settings.zegoEnabled
                  ? "ZEGO Configuration Preview"
                  : "Internal Motion Controls"
              }
              description={
                settings.zegoEnabled
                  ? "ZEGO is visible for planning only. The controls below are informational until credentials and backend integration are ready."
                  : "These controls shape the internal animation preview for Phase 1."
              }
            >
              {settings.zegoEnabled ? (
                <ZegoPlannedPanel />
              ) : (
                <div className="grid gap-4">
                  <ControlSlider
                    label="Intensity"
                    value={settings.intensity}
                    onChange={(value) => updateSetting("intensity", value)}
                  />
                  <ControlSlider
                    label="Motion Speed"
                    value={settings.motionSpeed}
                    onChange={(value) => updateSetting("motionSpeed", value)}
                  />
                  <ControlSlider
                    label="Glow Strength"
                    value={settings.glowStrength}
                    onChange={(value) => updateSetting("glowStrength", value)}
                  />
                  <ControlSlider
                    label="Pulse Strength"
                    value={settings.pulseStrength}
                    onChange={(value) => updateSetting("pulseStrength", value)}
                  />

                  <ToggleControl
                    label="Particles"
                    description="Decorative motion particles for internal avatar styles."
                    checked={settings.showParticles}
                    onChange={(value) => updateSetting("showParticles", value)}
                  />
                  <ToggleControl
                    label="Waveform"
                    description="Shows internal waveform-style motion where relevant."
                    checked={settings.showWaveform}
                    onChange={(value) => updateSetting("showWaveform", value)}
                  />
                  <ToggleControl
                    label="Status Text"
                    description="Shows the current preview state below the avatar."
                    checked={settings.showStatusText}
                    onChange={(value) => updateSetting("showStatusText", value)}
                  />
                  <ToggleControl
                    label="Native Basic Lip-Sync"
                    description="Phase 4 will connect this to audio amplitude and mouth movement."
                    checked={settings.lipSyncEnabled}
                    onChange={(value) => updateSetting("lipSyncEnabled", value)}
                  />
                  <ToggleControl
                    label="Voice-Reactive Motion"
                    description="Phase 4 will connect this to mic/output audio levels."
                    checked={settings.voiceReactiveEnabled}
                    onChange={(value) =>
                      updateSetting("voiceReactiveEnabled", value)
                    }
                  />
                </div>
              )}
            </Panel>

            <Panel
              eyebrow="Avatar Source"
              title="Internal Visual Mode"
              description="Choose the internal AiXia visual style. Uploadable assets come in Phase 3."
            >
              <div className="grid gap-3">
                {internalModes.map((mode) => (
                  <ChoiceCard
                    key={mode.id}
                    selected={settings.mode === mode.id && !settings.zegoEnabled}
                    disabled={settings.zegoEnabled}
                    label={mode.label}
                    description={mode.description}
                    onClick={() => updateSetting("mode", mode.id)}
                  />
                ))}
              </div>
            </Panel>

            <Panel
              eyebrow="Given States"
              title="Runtime State Preview"
              description="These states are fixed system states. Clicking only previews the visual behavior."
            >
              <div className="grid gap-3">
                {runtimeStates.map((state) => (
                  <ChoiceCard
                    key={state.id}
                    selected={settings.previewState === state.id}
                    label={state.label}
                    description={state.description}
                    onClick={() => updateSetting("previewState", state.id)}
                  />
                ))}
              </div>
            </Panel>

            <Panel
              eyebrow="Integration Status"
              title="What Phase 1 Includes"
              description="This page is only the clean foundation. No backend or ZEGO calls are added yet."
            >
              <div className="grid gap-3">
                <StatusLine
                  label="Internal engine"
                  value="Default active"
                  tone="emerald"
                />
                <StatusLine
                  label="ZEGO engine"
                  value="OFF by default"
                  tone="amber"
                />
                <StatusLine
                  label="Backend persistence"
                  value="Phase 2"
                  tone="slate"
                />
                <StatusLine
                  label="Asset uploads"
                  value="Phase 3"
                  tone="slate"
                />
                <StatusLine
                  label="Native lip-sync"
                  value="Phase 4"
                  tone="slate"
                />
                <StatusLine
                  label="Voice page connection"
                  value="Phase 5"
                  tone="slate"
                />
              </div>
            </Panel>
          </aside>
        </section>
      </div>
    </div>
  );
}

function AnimationPreview({ settings }: { settings: AnimationSettings }) {
  if (settings.zegoEnabled) {
    return (
      <div className="relative flex h-[520px] w-full items-center justify-center overflow-hidden rounded-[30px] border border-amber-400/20 bg-black/25">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(251,191,36,0.18),transparent_42%),radial-gradient(circle_at_50%_70%,rgba(6,182,212,0.12),transparent_46%)]" />
        <div className="relative flex w-[min(620px,calc(100%-48px))] flex-col items-center rounded-[30px] border border-amber-400/20 bg-black/45 p-8 text-center backdrop-blur-xl">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200 shadow-2xl shadow-amber-400/20">
            <Lock className="h-12 w-12" />
          </div>

          <div className="mt-6 inline-flex rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200">
            ZEGO Digital Human
          </div>

          <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            External Engine Enabled
          </h3>

          <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">
            ZEGO mode is visible for architecture planning, but it is not connected
            in Phase 1. No ZEGO API calls, secrets, streams, or billing are active.
          </p>

          <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
            <StatusLine label="API calls" value="Disabled" tone="amber" />
            <StatusLine label="Secrets" value="Not configured" tone="slate" />
            <StatusLine label="Stream" value="Not connected" tone="slate" />
            <StatusLine label="Billing safety" value="Planned" tone="emerald" />
          </div>
        </div>
      </div>
    );
  }

  const stateTone = getStateTone(settings.previewState);
  const glowOpacity = Math.max(0.18, settings.glowStrength / 100);
  const scale =
    settings.previewState === "speaking"
      ? "scale-110"
      : settings.previewState === "listening"
        ? "scale-105"
        : settings.previewState === "thinking"
          ? "scale-100"
          : settings.previewState === "error"
            ? "scale-95"
            : "scale-95";

  const toneClass =
    stateTone === "violet"
      ? "border-violet-300/60 text-violet-100 shadow-violet-400/25"
      : stateTone === "amber"
        ? "border-amber-300/60 text-amber-100 shadow-amber-400/25"
        : stateTone === "rose"
          ? "border-rose-300/60 text-rose-100 shadow-rose-400/25"
          : stateTone === "slate"
            ? "border-slate-300/30 text-slate-100 shadow-slate-400/10"
            : stateTone === "cyan"
              ? "border-cyan-300/70 text-cyan-100 shadow-cyan-400/30"
              : "border-emerald-300/50 text-emerald-100 shadow-emerald-400/20";

  return (
    <div className="relative flex h-[520px] w-full items-center justify-center overflow-hidden rounded-[30px] border border-white/10 bg-black/25">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,0.20),transparent_42%),radial-gradient(circle_at_50%_70%,rgba(139,92,246,0.16),transparent_46%)]" />

      {settings.showParticles ? (
        <div className="absolute inset-0 opacity-60">
          {Array.from({ length: 18 }).map((_, index) => (
            <span
              key={index}
              className="absolute h-1.5 w-1.5 rounded-full bg-cyan-200/40"
              style={{
                left: `${8 + ((index * 19) % 84)}%`,
                top: `${10 + ((index * 31) % 78)}%`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div
        className={`absolute h-72 w-72 rounded-full blur-3xl transition-all duration-700 ${scale}`}
        style={{
          opacity: glowOpacity,
          background:
            stateTone === "violet"
              ? "rgba(167,139,250,0.7)"
              : stateTone === "amber"
                ? "rgba(251,191,36,0.65)"
                : stateTone === "rose"
                  ? "rgba(251,113,133,0.62)"
                  : stateTone === "slate"
                    ? "rgba(148,163,184,0.38)"
                    : "rgba(34,211,238,0.75)",
        }}
      />

      <div
        className={`relative flex h-64 w-64 items-center justify-center rounded-full border bg-black/55 shadow-2xl transition-all duration-700 ${scale} ${toneClass}`}
      >
        <div
          className={`absolute inset-4 rounded-full border border-white/10 ${
            settings.pulseStrength > 0 ? "animate-pulse" : ""
          }`}
        />
        <div className="absolute inset-9 rounded-full border border-white/10" />

        {settings.mode === "waveform" ? (
          <WaveformPreview active={settings.showWaveform} />
        ) : settings.mode === "robot" ? (
          <RobotPreview lipSyncEnabled={settings.lipSyncEnabled} />
        ) : settings.mode === "hologram" ? (
          <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-cyan-300/40 bg-cyan-500/10 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">
            Holo
          </div>
        ) : settings.mode === "mascot" ? (
          <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] text-5xl">
            ✦
          </div>
        ) : (
          <div className="h-28 w-28 rounded-full border border-cyan-300/30 bg-cyan-400/20 shadow-2xl shadow-cyan-400/20" />
        )}
      </div>

      {settings.showStatusText ? (
        <div className="absolute bottom-8 left-1/2 w-[min(520px,calc(100%-48px))] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-center backdrop-blur-xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Preview State
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {getStateLabel(settings.previewState)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WaveformPreview({ active }: { active: boolean }) {
  return (
    <div className="flex h-28 items-center gap-2">
      {Array.from({ length: 9 }).map((_, index) => (
        <span
          key={index}
          className="w-2 rounded-full bg-cyan-200/80"
          style={{
            height: active ? `${28 + ((index * 17) % 70)}px` : "28px",
          }}
        />
      ))}
    </div>
  );
}

function RobotPreview({ lipSyncEnabled }: { lipSyncEnabled: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <Bot className="h-20 w-20" />
      <div
        className={`mt-3 rounded-full bg-cyan-100 transition-all ${
          lipSyncEnabled ? "h-2 w-10" : "h-1 w-6"
        }`}
      />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: string;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose" | "slate";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-200"
      : tone === "amber"
        ? "text-amber-200"
        : tone === "violet"
          ? "text-violet-200"
          : tone === "rose"
            ? "text-rose-200"
            : tone === "slate"
              ? "text-slate-300"
              : "text-cyan-200";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <p className={`mt-2 truncate text-3xl font-semibold ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function ControlSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
          {value}%
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 w-full accent-cyan-400"
      />
    </div>
  );
}

function ToggleControl({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition ${
        checked
          ? "border-cyan-400/30 bg-cyan-500/10"
          : "border-white/10 bg-black/20 hover:border-white/20"
      }`}
    >
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>

      {checked ? (
        <ToggleRight className="h-5 w-5 shrink-0 text-cyan-200" />
      ) : (
        <ToggleLeft className="h-5 w-5 shrink-0 text-slate-500" />
      )}
    </button>
  );
}

function EngineCard({
  selected,
  icon: Icon,
  label,
  status,
  description,
  onClick,
}: {
  selected: boolean;
  icon: ElementType;
  label: string;
  status: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-cyan-400/30 bg-cyan-500/10"
          : "border-white/10 bg-black/20 hover:border-white/20"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`rounded-2xl border p-3 ${
              selected
                ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                : "border-white/10 bg-white/[0.04] text-slate-500"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div>
            <div className="text-sm font-semibold text-white">{label}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-cyan-200/70">
              {status}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {description}
            </p>
          </div>
        </div>

        {selected ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-200" />
        ) : null}
      </div>
    </button>
  );
}

function ChoiceCard({
  selected,
  disabled = false,
  label,
  description,
  onClick,
}: {
  selected: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-start justify-between gap-4 rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-cyan-400/30 bg-cyan-500/10"
          : "border-white/10 bg-black/20 hover:border-white/20"
      } disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-white/10`}
    >
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>

      {selected ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-200" />
      ) : null}
    </button>
  );
}

function Panel({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl ${className}`}>
      <div className="border-b border-white/10 px-5 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>

      <div className="p-5">{children}</div>
    </div>
  );
}

function ZegoPlannedPanel() {
  return (
    <div className="grid gap-4">
      <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <Power className="mt-0.5 h-5 w-5 text-amber-200" />
          <div>
            <div className="text-sm font-semibold text-amber-100">
              ZEGO is ON in the UI, but not connected yet
            </div>
            <p className="mt-2 text-xs leading-5 text-amber-100/70">
              Phase 1 only prepares the page foundation. ZEGO API credentials,
              Supabase Edge Functions, stream creation, and billing safety controls
              will be built in later phases.
            </p>
          </div>
        </div>
      </div>

      <StatusLine label="Provider" value="ZEGO 即构" tone="amber" />
      <StatusLine label="Connection" value="Not connected" tone="slate" />
      <StatusLine label="API calls" value="Disabled in Phase 1" tone="slate" />
      <StatusLine label="Secrets" value="Backend only later" tone="emerald" />
      <StatusLine
        label="Billing mode"
        value="Active instance time later"
        tone="amber"
      />
      <StatusLine
        label="Required later"
        value="AppID, Server Secret, DigitalHumanId"
        tone="slate"
      />
    </div>
  );
}

function StatusLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "slate";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
      : tone === "amber"
        ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
        : "border-white/10 bg-black/20 text-slate-300";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
