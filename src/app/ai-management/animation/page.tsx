import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  CircleDot,
  Eye,
  Film,
  Gauge,
  MonitorPlay,
  Orbit,
  Pause,
  Play,
  Radio,
  RefreshCcw,
  Save,
  Sparkles,
  Waves,
} from "lucide-react";

type AnimationMode =
  | "orb"
  | "waveform"
  | "robot"
  | "hologram"
  | "mascot";

type AnimationState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "paused";

type AnimationSettings = {
  mode: AnimationMode;
  state: AnimationState;
  intensity: number;
  motionSpeed: number;
  glowStrength: number;
  pulseStrength: number;
  showParticles: boolean;
  showWaveform: boolean;
  showStatusText: boolean;
};

const defaultSettings: AnimationSettings = {
  mode: "orb",
  state: "idle",
  intensity: 72,
  motionSpeed: 58,
  glowStrength: 76,
  pulseStrength: 64,
  showParticles: true,
  showWaveform: true,
  showStatusText: true,
};

const modes: Array<{
  id: AnimationMode;
  label: string;
  description: string;
}> = [
  {
    id: "orb",
    label: "Orb",
    description: "Premium glowing AI orb for clean enterprise experience.",
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
    description: "Brandable character direction for future customer-facing UI.",
  },
];

const states: Array<{
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
    description: "Microphone is active and user is speaking.",
  },
  {
    id: "thinking",
    label: "Thinking",
    description: "Ai-router is preparing an answer.",
  },
  {
    id: "speaking",
    label: "Speaking",
    description: "AiXia is replying with voice/audio.",
  },
  {
    id: "paused",
    label: "Paused",
    description: "Conversation is paused or inactive.",
  },
];

function getStateLabel(state: AnimationState) {
  return states.find((item) => item.id === state)?.label ?? "Idle";
}

function getStateTone(state: AnimationState) {
  if (state === "listening") return "violet";
  if (state === "thinking") return "amber";
  if (state === "speaking") return "cyan";
  if (state === "paused") return "rose";
  return "emerald";
}

export default function AIAnimationPage() {
  const navigate = useNavigate();
  const [settings, setSettings] =
    useState<AnimationSettings>(defaultSettings);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const currentMode = useMemo(
    () => modes.find((mode) => mode.id === settings.mode) ?? modes[0],
    [settings.mode]
  );

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

  function resetSettings() {
    setSettings(defaultSettings);
    setSavedMessage("Animation settings reset to default preview.");
  }

  function saveSettings() {
    setSavedMessage(
      "Animation settings saved locally for this preview. Backend persistence comes next."
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
                  Design the visual assistant layer for AiXia: orb, waveform,
                  robot, hologram, or mascot. This page controls how the avatar
                  looks in idle, listening, thinking, speaking, and paused states.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[620px]">
              <MetricCard
                icon={MonitorPlay}
                label="Mode"
                value={currentMode.label}
                tone="cyan"
              />
              <MetricCard
                icon={CircleDot}
                label="State"
                value={getStateLabel(settings.state)}
                tone={getStateTone(settings.state)}
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

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="grid min-h-[760px] overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.20),rgba(2,6,23,0.94)_42%,rgba(2,6,23,0.99))] shadow-2xl shadow-cyan-950/20 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="flex min-h-0 items-center justify-center p-6">
              <AnimationPreview settings={settings} />
            </div>

            <div className="flex min-h-0 flex-col border-t border-white/10 bg-black/10 xl:border-l xl:border-t-0">
              <div className="border-b border-white/10 p-5">
                <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  Live Preview Controls
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  {currentMode.label} avatar preview
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {currentMode.description}
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
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
                    checked={settings.showParticles}
                    onChange={(value) => updateSetting("showParticles", value)}
                  />
                  <ToggleControl
                    label="Waveform"
                    checked={settings.showWaveform}
                    onChange={(value) => updateSetting("showWaveform", value)}
                  />
                  <ToggleControl
                    label="Status Text"
                    checked={settings.showStatusText}
                    onChange={(value) => updateSetting("showStatusText", value)}
                  />
                </div>
              </div>

              <div className="grid gap-3 border-t border-white/10 p-5 sm:grid-cols-2">
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

          <aside className="grid gap-5">
            <Panel
              eyebrow="Avatar Type"
              title="Visual Mode"
              description="Choose the primary assistant visual style."
            >
              <div className="grid gap-3">
                {modes.map((mode) => (
                  <ChoiceCard
                    key={mode.id}
                    selected={settings.mode === mode.id}
                    label={mode.label}
                    description={mode.description}
                    onClick={() => updateSetting("mode", mode.id)}
                  />
                ))}
              </div>
            </Panel>

            <Panel
              eyebrow="Runtime States"
              title="Preview State"
              description="Test how the avatar behaves in each realtime state."
            >
              <div className="grid gap-3">
                {states.map((state) => (
                  <ChoiceCard
                    key={state.id}
                    selected={settings.state === state.id}
                    label={state.label}
                    description={state.description}
                    onClick={() => updateSetting("state", state.id)}
                  />
                ))}
              </div>
            </Panel>
          </aside>
        </section>
      </div>
    </div>
  );
}
