import { useMemo, useState, type ElementType } from "react";
import {
  Activity,
  Brain,
  Database,
  FileCheck2,
  Gauge,
  Mic,
  MessageSquareText,
  Shield,
  Sparkles,
  Upload,
  Volume2,
  Wand2,
} from "lucide-react";

type StudioSectionId =
  | "overview"
  | "character"
  | "knowledge"
  | "core-settings"
  | "approved"
  | "cache"
  | "memory"
  | "guardrails"
  | "voice"
  | "state-of-mind"
  | "activity"
  | "publish";

type StudioNavItem = {
  id: StudioSectionId;
  label: string;
  icon: ElementType;
  hint: string;
};

type OverviewMetric = {
  label: string;
  value: string;
  sublabel: string;
};

const studioNavItems: StudioNavItem[] = [
  {
    id: "overview",
    label: "AI Studio Overview",
    icon: Sparkles,
    hint: "Live system overview",
  },
  {
    id: "character",
    label: "Character / Identity",
    icon: Wand2,
    hint: "Core AI identity",
  },
  {
    id: "knowledge",
    label: "Knowledge Bank",
    icon: Database,
    hint: "Knowledge sources",
  },
  {
    id: "core-settings",
    label: "Core AI Settings",
    icon: Gauge,
    hint: "Runtime controls",
  },
  {
    id: "approved",
    label: "Approved Answers",
    icon: FileCheck2,
    hint: "Controlled answers",
  },
  {
    id: "cache",
    label: "Cache Review",
    icon: Upload,
    hint: "Reusable AI memory",
  },
  {
    id: "memory",
    label: "Memory",
    icon: Brain,
    hint: "Context and recall",
  },
  {
    id: "guardrails",
    label: "Guardrails",
    icon: Shield,
    hint: "Allowed behavior",
  },
  {
    id: "voice",
    label: "Voice",
    icon: Mic,
    hint: "TTS / STT controls",
  },
  {
    id: "state-of-mind",
    label: "State of Mind",
    icon: Activity,
    hint: "Tone and behavior",
  },
  {
    id: "activity",
    label: "Activity & Logs",
    icon: MessageSquareText,
    hint: "System actions",
  },
  {
    id: "publish",
    label: "Publish / Deploy",
    icon: Volume2,
    hint: "Release control",
  },
];

const overviewMetrics: OverviewMetric[] = [
  {
    label: "Approved Answers",
    value: "12",
    sublabel: "Controlled outputs live",
  },
  {
    label: "Cached Answers",
    value: "48",
    sublabel: "Reusable low-cost replies",
  },
  {
    label: "Knowledge Items",
    value: "26",
    sublabel: "GitHub + manual sources",
  },
  {
    label: "Voice Assets",
    value: "3",
    sublabel: "Prepared for TTS / STT",
  },
];

const previewMessages = [
  {
    role: "user",
    content: "How should I handle an unpaid invoice?",
  },
  {
    role: "assistant",
    content:
      "Open the invoice in Finance, review due date and payment status, record follow-up, and escalate according to your workflow if payment remains overdue.",
  },
  {
    role: "user",
    content: "Where does that answer come from?",
  },
  {
    role: "assistant",
    content:
      "This studio combines approved answers, reusable cache, GitHub knowledge, manual knowledge items, and AI fallback.",
  },
];

function getSectionDescription(section: StudioSectionId) {
  switch (section) {
    case "overview":
      return "Global status, knowledge health, cache control, and studio readiness.";
    case "character":
      return "Define AI identity, speaking style, personality, and behavior baseline.";
    case "knowledge":
      return "Manage GitHub knowledge, manual knowledge items, and future uploads.";
    case "core-settings":
      return "Control model behavior, refresh logic, runtime policies, and AI configuration.";
    case "approved":
      return "Manage exact controlled answers that override cache and AI generation.";
    case "cache":
      return "Inspect, clean, block, edit, and promote cached AI answers.";
    case "memory":
      return "Review future context memory and long-lived recall systems.";
    case "guardrails":
      return "Define what the AI can say, cannot say, and how it should behave safely.";
    case "voice":
      return "Configure future TTS, STT, voice assets, and speech pipelines.";
    case "state-of-mind":
      return "Tune response mood, confidence, and future behavioral overlays.";
    case "activity":
      return "Audit AI changes, promotions, cache actions, and system events.";
    case "publish":
      return "Review readiness, push AI updates live, and manage deployment control.";
    default:
      return "";
  }
}

function renderCenterContent(section: StudioSectionId) {
  if (section === "overview") {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
          {overviewMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl"
            >
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">
                  {metric.label}
                </div>
                <div className="text-3xl font-semibold tracking-tight text-white">
                  {metric.value}
                </div>
                <div className="text-sm text-white/50">{metric.sublabel}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">
                  Studio Runtime Flow
                </h2>
                <p className="text-sm text-white/55">
                  Current response order and control logic.
                </p>
              </div>

              <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                Healthy
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                "Approved Answers",
                "Cache Review",
                "GitHub Knowledge",
                "AI Fallback",
              ].map((item, index) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-white/35">
                    Layer {index + 1}
                  </div>
                  <div className="text-sm font-medium text-white">{item}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">
                Next Build Priorities
              </h2>
              <p className="text-sm text-white/55">
                First modules to wire after the shell is approved.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {[
                "Knowledge Bank",
                "Core AI Settings",
                "Approved Answers",
                "Cache Review",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-dashed border-cyan-400/20 bg-black/20 p-8">
      <div className="space-y-2">
        <div className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
          Coming Next
        </div>
        <h2 className="text-xl font-semibold text-white">
          {studioNavItems.find((item) => item.id === section)?.label}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-white/55">
          {getSectionDescription(section)}
        </p>
      </div>
    </div>
  );
}

export default function AIManagementPage() {
  const [activeSection, setActiveSection] =
    useState<StudioSectionId>("overview");

  const activeNav = useMemo(
    () => studioNavItems.find((item) => item.id === activeSection),
    [activeSection]
  );

  return (
    <div className="grid min-h-[calc(100vh-165px)] gap-4 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
      <aside className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/90">
              AI Studio
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Control Surface
            </h1>
            <p className="text-sm text-white/50">
              Configure the full AI system.
            </p>
          </div>
        </div>

        <div className="flex h-[calc(100%-96px)] min-h-0 flex-col">
          <nav className="flex-1 min-h-0 overflow-y-auto px-4 py-4 overscroll-contain">
            <div className="space-y-2">
              {studioNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeSection;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full rounded-[22px] border px-4 py-3 text-left transition-all duration-300 ${
                      isActive
                        ? "border-cyan-400/20 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]"
                        : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-xl p-2 ${
                          isActive
                            ? "bg-cyan-500/15 text-cyan-200"
                            : "bg-white/[0.04] text-white/50"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`text-sm font-medium ${
                            isActive ? "text-white" : "text-white/78"
                          }`}
                        >
                          {item.label}
                        </div>
                        <div className="mt-1 text-xs text-white/40">
                          {item.hint}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>
