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
type AnimationState = "idle" | "listening" | "thinking" | "speaking" | "paused" | "error";

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

const modes: Array<{ id: AnimationMode; label: string; description: string }> = [
  { id: "orb", label: "Orb", description: "Premium glowing AiXia orb." },
  { id: "waveform", label: "Waveform", description: "Audio-reactive signal style." },
  { id: "robot", label: "Robot", description: "Friendly AiXia robot identity." },
  { id: "hologram", label: "Hologram", description: "Futuristic projection layer." },
  { id: "mascot", label: "Mascot", description: "Brandable assistant character." },
];

const states: Array<{ id: AnimationState; label: string; description: string }> = [
  { id: "idle", label: "Idle", description: "Ready and waiting." },
  { id: "listening", label: "Listening", description: "User is speaking." },
  { id: "thinking", label: "Thinking", description: "Router is preparing answer." },
  { id: "speaking", label: "Speaking", description: "AiXia is replying." },
  { id: "paused", label: "Paused", description: "Conversation paused." },
  { id: "error", label: "Error / Disconnected", description: "Connection issue." },
];

function getStateLabel(state: AnimationState) {
  return states.find((item) => item.id === state)?.label ?? "Idle";
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
    () => modes.find((mode) => mode.id === settings.mode) ?? modes[0],
    [settings.mode]
  );

  const engineLabel = settings.zegoEnabled ? "ZEGO Digital Human" : "Internal AiXia";

  function updateSetting<K extends keyof AnimationSettings>(key: K, value: AnimationSettings[K]) {
    setSavedMessage(null);
    setSettings((current) => ({ ...current, [key]: value }));
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
    setSavedMessage("Animation page reset to internal AiXia engine.");
  }

  function saveSettings() {
    setSavedMessage("Phase 1 preview saved locally. Backend persistence comes in Phase 2.");
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto grid w-full max-w-[1720px] gap-5">
        <header className="rounded-[34px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_620px]">
            <div>
              <button
                type="button"
                onClick={() => navigate("/ai-management")}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
              >
                <ArrowLeft className="h-4 w-4" />
                AI Studio
              </button>

              <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <Waves className="h-3.5 w-3.5" />
                Animation / Avatar
              </div>

              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                Animation Studio
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                Internal AiXia animation is the default. ZEGO Digital Human is an optional
                external engine, OFF by default, prepared for later API integration.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard icon={MonitorPlay} label="Engine" value={engineLabel} tone={settings.zegoEnabled ? "amber" : "cyan"} />
              <MetricCard icon={CircleDot} label="State" value={getStateLabel(settings.previewState)} tone={getStateTone(settings.previewState)} />
              <MetricCard icon={Gauge} label="Intensity" value={`${settings.intensity}%`} tone="violet" />
            </div>
          </div>
        </header>

        {savedMessage ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {savedMessage}
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[520px_minmax(0,1fr)_420px]">
          <Panel eyebrow="Preview" title={settings.zegoEnabled ? "ZEGO Preview" : `${currentMode.label} Preview`} description="Live visual preview for Phase 1.">
            <AnimationPreview settings={settings} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
          </Panel>

          <div className="grid content-start gap-5">
            <Panel eyebrow="Controls" title={settings.zegoEnabled ? "ZEGO Configuration Preview" : "Internal Motion Controls"} description={settings.zegoEnabled ? "ZEGO is visible only. No API calls in Phase 1." : "Shape the internal AiXia animation preview."}>
              {settings.zegoEnabled ? (
                <ZegoPlannedPanel />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <ControlSlider label="Intensity" value={settings.intensity} onChange={(value) => updateSetting("intensity", value)} />
                  <ControlSlider label="Motion Speed" value={settings.motionSpeed} onChange={(value) => updateSetting("motionSpeed", value)} />
                  <ControlSlider label="Glow Strength" value={settings.glowStrength} onChange={(value) => updateSetting("glowStrength", value)} />
                  <ControlSlider label="Pulse Strength" value={settings.pulseStrength} onChange={(value) => updateSetting("pulseStrength", value)} />
                  <ToggleControl label="Particles" checked={settings.showParticles} onChange={(value) => updateSetting("showParticles", value)} />
                  <ToggleControl label="Waveform" checked={settings.showWaveform} onChange={(value) => updateSetting("showWaveform", value)} />
                  <ToggleControl label="Status Text" checked={settings.showStatusText} onChange={(value) => updateSetting("showStatusText", value)} />
                  <ToggleControl label="Native Basic Lip-Sync" checked={settings.lipSyncEnabled} onChange={(value) => updateSetting("lipSyncEnabled", value)} />
                  <ToggleControl label="Voice-Reactive Motion" checked={settings.voiceReactiveEnabled} onChange={(value) => updateSetting("voiceReactiveEnabled", value)} />
                </div>
              )}
            </Panel>

            <Panel eyebrow="Avatar Source" title="Internal Visual Mode" description="Uploadable image, video, Lottie, and 3D assets come later.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {modes.map((mode) => (
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

            <Panel eyebrow="Given States" title="Runtime State Preview" description="States are fixed. Clicking only previews behavior.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {states.map((state) => (
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
          </div>

          <div className="grid content-start gap-5">
            <Panel eyebrow="Engine" title="Avatar Engine" description="Internal is default. ZEGO is optional and OFF by default.">
              <div className="grid gap-3">
                <EngineCard
                  selected={!settings.zegoEnabled}
                  icon={Sparkles}
                  label="Internal AiXia Animation Engine"
                  status="Default Active"
                  description="Native visuals, motion controls, uploaded assets later, basic native lip-sync later."
                  onClick={() => setZegoEnabled(false)}
                />
                <EngineCard
                  selected={settings.zegoEnabled}
                  icon={Zap}
                  label="ZEGO Digital Human"
                  status={settings.zegoEnabled ? "Enabled / Not Connected" : "Off"}
                  description="External 1080P digital human engine. Supabase Edge Function integration later."
                  onClick={() => setZegoEnabled(!settings.zegoEnabled)}
                />
              </div>
            </Panel>

            <Panel eyebrow="Phase 1 Status" title="What This Includes" description="Foundation only. No backend or ZEGO calls.">
              <div className="grid gap-3">
                <StatusLine label="Internal engine" value="Default active" tone="emerald" />
                <StatusLine label="ZEGO engine" value="OFF by default" tone="amber" />
                <StatusLine label="Backend persistence" value="Phase 2" tone="slate" />
                <StatusLine label="Asset uploads" value="Phase 3" tone="slate" />
                <StatusLine label="Native lip-sync" value="Phase 4" tone="slate" />
                <StatusLine label="Voice page connection" value="Phase 5" tone="slate" />
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </div>
  );
}

function AnimationPreview({ settings }: { settings: AnimationSettings }) {
  if (settings.zegoEnabled) {
    return (
      <div className="relative flex h-[420px] items-center justify-center overflow-hidden rounded-[26px] border border-amber-400/20 bg-black/25">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.18),transparent_48%)]" />
        <div className="relative w-[min(380px,calc(100%-32px))] rounded-[26px] border border-amber-400/20 bg-black/45 p-6 text-center backdrop-blur-xl">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200">
            <Lock className="h-10 w-10" />
          </div>
          <h3 className="mt-5 text-2xl font-semibold text-white">ZEGO Enabled</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Visible only for Phase 1. No ZEGO API calls, streams, secrets, or billing.
          </p>
        </div>
      </div>
    );
  }

  const tone = getStateTone(settings.previewState);
  const glow = tone === "rose" ? "rgba(251,113,133,0.65)" : tone === "amber" ? "rgba(251,191,36,0.65)" : tone === "violet" ? "rgba(167,139,250,0.7)" : "rgba(34,211,238,0.75)";

  return (
    <div className="relative flex h-[420px] items-center justify-center overflow-hidden rounded-[26px] border border-white/10 bg-black/25">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,0.20),transparent_42%),radial-gradient(circle_at_50%_70%,rgba(139,92,246,0.16),transparent_46%)]" />

      {settings.showParticles ? (
        <div className="absolute inset-0 opacity-60">
          {Array.from({ length: 16 }).map((_, index) => (
            <span
              key={index}
              className="absolute h-1.5 w-1.5 rounded-full bg-cyan-200/40"
              style={{ left: `${8 + ((index * 19) % 84)}%`, top: `${10 + ((index * 31) % 78)}%` }}
            />
          ))}
        </div>
      ) : null}

      <div className="absolute h-64 w-64 rounded-full blur-3xl" style={{ opacity: Math.max(0.18, settings.glowStrength / 100), background: glow }} />

      <div className="relative flex h-52 w-52 items-center justify-center rounded-full border border-cyan-300/60 bg-black/55 text-cyan-100 shadow-2xl shadow-cyan-400/30">
        <div className="absolute inset-4 rounded-full border border-white/10 animate-pulse" />
        <div className="absolute inset-9 rounded-full border border-white/10" />

        {settings.mode === "waveform" ? <WaveformPreview active={settings.showWaveform} /> : null}
        {settings.mode === "robot" ? <RobotPreview lipSyncEnabled={settings.lipSyncEnabled} /> : null}
        {settings.mode === "hologram" ? <div className="rounded-3xl border border-cyan-300/40 bg-cyan-500/10 px-6 py-5 text-sm font-semibold uppercase tracking-[0.2em]">Holo</div> : null}
        {settings.mode === "mascot" ? <div className="text-5xl">✦</div> : null}
        {settings.mode === "orb" ? <div className="h-24 w-24 rounded-full border border-cyan-300/30 bg-cyan-400/20 shadow-2xl shadow-cyan-400/20" /> : null}
      </div>

      {settings.showStatusText ? (
        <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-black/35 px-5 py-3 text-center backdrop-blur-xl">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Preview State</div>
          <div className="mt-1 text-xl font-semibold text-white">{getStateLabel(settings.previewState)}</div>
        </div>
      ) : null}
    </div>
  );
}

function WaveformPreview({ active }: { active: boolean }) {
  return (
    <div className="flex h-24 items-center gap-2">
      {Array.from({ length: 9 }).map((_, index) => (
        <span key={index} className="w-2 rounded-full bg-cyan-200/80" style={{ height: active ? `${24 + ((index * 17) % 60)}px` : "24px" }} />
      ))}
    </div>
  );
}

function RobotPreview({ lipSyncEnabled }: { lipSyncEnabled: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <Bot className="h-20 w-20" />
      <div className={`mt-3 rounded-full bg-cyan-100 ${lipSyncEnabled ? "h-2 w-10" : "h-1 w-6"}`} />
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: ElementType; label: string; value: string; tone: "cyan" | "emerald" | "amber" | "violet" | "rose" | "slate" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <Icon className={`h-4 w-4 ${toneColor(tone)}`} />
      </div>
      <p className={`mt-2 truncate text-2xl font-semibold ${toneColor(tone)}`}>{value}</p>
    </div>
  );
}

function ControlSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">{value}%</div>
      </div>
      <input type="range" min={0} max={100} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-4 w-full accent-cyan-400" />
    </div>
  );
}

function ToggleControl({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition ${checked ? "border-cyan-400/30 bg-cyan-500/10" : "border-white/10 bg-black/20 hover:border-white/20"}`}>
      <div className="text-sm font-semibold text-white">{label}</div>
      {checked ? <ToggleRight className="h-5 w-5 shrink-0 text-cyan-200" /> : <ToggleLeft className="h-5 w-5 shrink-0 text-slate-500" />}
    </button>
  );
}

function EngineCard({ selected, icon: Icon, label, status, description, onClick }: { selected: boolean; icon: ElementType; label: string; status: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${selected ? "border-cyan-400/30 bg-cyan-500/10" : "border-white/10 bg-black/20 hover:border-white/20"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`rounded-2xl border p-3 ${selected ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200" : "border-white/10 bg-white/[0.04] text-slate-500"}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{label}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-cyan-200/70">{status}</div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
          </div>
        </div>
        {selected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-200" /> : null}
      </div>
    </button>
  );
}

function ChoiceCard({ selected, disabled = false, label, description, onClick }: { selected: boolean; disabled?: boolean; label: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`flex items-start justify-between gap-4 rounded-2xl border p-4 text-left transition ${selected ? "border-cyan-400/30 bg-cyan-500/10" : "border-white/10 bg-black/20 hover:border-white/20"} disabled:cursor-not-allowed disabled:opacity-45`}>
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      {selected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-200" /> : null}
    </button>
  );
}

function Panel({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">{eyebrow}</div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ZegoPlannedPanel() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-[22px] border border-amber-400/20 bg-amber-500/10 p-4 md:col-span-2">
        <div className="flex items-start gap-3">
          <Power className="mt-0.5 h-5 w-5 text-amber-200" />
          <div>
            <div className="text-sm font-semibold text-amber-100">ZEGO is ON in the UI, but not connected yet</div>
            <p className="mt-2 text-xs leading-5 text-amber-100/70">No API calls, no streams, no secrets, no billing in Phase 1.</p>
          </div>
        </div>
      </div>
      <StatusLine label="Provider" value="ZEGO 即构" tone="amber" />
      <StatusLine label="Connection" value="Not connected" tone="slate" />
      <StatusLine label="API calls" value="Disabled" tone="slate" />
      <StatusLine label="Secrets" value="Backend only later" tone="emerald" />
    </div>
  );
}

function StatusLine({ label, value, tone }: { label: string; value: string; tone: "emerald" | "amber" | "slate" }) {
  const toneClass = tone === "emerald" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200" : tone === "amber" ? "border-amber-400/20 bg-amber-500/10 text-amber-200" : "border-white/10 bg-black/20 text-slate-300";
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function toneColor(tone: "cyan" | "emerald" | "amber" | "violet" | "rose" | "slate") {
  if (tone === "emerald") return "text-emerald-200";
  if (tone === "amber") return "text-amber-200";
  if (tone === "violet") return "text-violet-200";
  if (tone === "rose") return "text-rose-200";
  if (tone === "slate") return "text-slate-300";
  return "text-cyan-200";
}
