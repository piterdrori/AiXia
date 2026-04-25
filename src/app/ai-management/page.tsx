import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  Activity,
  ArrowRight,
  Brain,
  Bot,
  Database,
  FileCheck2,
  Gauge,
  Mic,
  MessageSquareText,
  RefreshCcw,
  Shield,
  Sparkles,
  Wand2,
  Waves,
} from "lucide-react";

type StudioModuleId =
  | "character"
  | "state-of-mind"
  | "guardrails"
  | "core-settings"
  | "knowledge"
  | "approved"
  | "cache"
  | "memory"
  | "activity"
  | "voice"
  | "animation";

type StudioModule = {
  id: StudioModuleId;
  label: string;
  description: string;
  route?: string;
  icon: ElementType;
  status: "live" | "ready" | "draft";
  group: "Behavior" | "Knowledge" | "Runtime" | "Experience";
};

type StudioStats = {
  approvedAnswers: number;
  cachedAnswers: number;
  knowledgeItems: number;
  sessions: number;
  guardrailLogs: number;
};

type ActivityLog = {
  id: string;
  action_type: string;
  entity_type: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const defaultStats: StudioStats = {
  approvedAnswers: 0,
  cachedAnswers: 0,
  knowledgeItems: 0,
  sessions: 0,
  guardrailLogs: 0,
};

const studioModules: StudioModule[] = [
  {
    id: "character",
    label: "Character / Identity",
    description:
      "Stable AI identity, role, mission, personality, and communication baseline.",
    route: "/ai-management/character",
    icon: Wand2,
    status: "live",
    group: "Behavior",
  },
  {
    id: "state-of-mind",
    label: "State of Mind",
    description:
      "Optional temporary behavior overlay for mood, posture, urgency, and diagnostic style.",
    route: "/ai-management/state-of-mind",
    icon: Activity,
    status: "live",
    group: "Behavior",
  },
  {
    id: "guardrails",
    label: "Guardrails",
    description:
      "Single source of truth for visible business guardrails and refusal controls.",
    route: "/ai-management/guardrails",
    icon: Shield,
    status: "live",
    group: "Behavior",
  },
  {
    id: "core-settings",
    label: "Core AI Settings",
    description:
      "Runtime engine controls: model, temperature, cache, semantic matching, learning, and diagnostics.",
    route: "/ai-management/core-settings",
    icon: Gauge,
    status: "live",
    group: "Runtime",
  },
  {
    id: "knowledge",
    label: "Knowledge Bank",
    description:
      "Active platform knowledge, manual knowledge items, and GitHub knowledge sources.",
    route: "/ai-management/knowledge",
    icon: Database,
    status: "live",
    group: "Knowledge",
  },
  {
    id: "approved",
    label: "Approved Answers",
    description:
      "Exact controlled answers that override cache and generated AI fallback.",
    route: "/ai-management/approved-answers",
    icon: FileCheck2,
    status: "live",
    group: "Knowledge",
  },
  {
    id: "cache",
    label: "Cache Review",
    description:
      "Review reusable answers, block bad cache, clean duplicates, and promote good responses.",
    route: "/ai-management/cache-review",
    icon: Sparkles,
    status: "live",
    group: "Knowledge",
  },
  {
    id: "memory",
    label: "Memory / Sessions",
    description:
      "Conversation sessions, message history, feedback, summaries, and AI quality insights.",
    route: "/ai-management/memory",
    icon: Brain,
    status: "live",
    group: "Runtime",
  },
  {
    id: "activity",
    label: "Activity & Logs",
    description:
      "Audit router actions, cache events, approved-answer changes, and control-panel updates.",
    route: "/ai-management/activity",
    icon: MessageSquareText,
    status: "live",
    group: "Runtime",
  },
  {
    id: "voice",
    label: "Voice",
    description:
      "Future TTS/STT control layer for speaking with the assistant.",
    icon: Mic,
    status: "draft",
    group: "Experience",
  },
  {
    id: "animation",
    label: "Animation / Avatar",
    description:
      "Future visual assistant layer: orb, waveform, avatar, robot, hologram, or mascot.",
    icon: Waves,
    status: "draft",
    group: "Experience",
  },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDetails(details: Record<string, unknown> | null) {
  if (!details) return "No details";

  const keys = Object.keys(details);

  if (keys.length === 0) return "No details";

  return keys
    .slice(0, 3)
    .map((key) => `${key}: ${String(details[key])}`)
    .join(" · ");
}

async function getCount(table: string, filters?: (query: any) => any) {
  let query = supabase.from(table).select("id", {
    count: "exact",
    head: true,
  });

  if (filters) {
    query = filters(query);
  }

  const { count } = await query;

  return count ?? 0;
}

export default function AIManagementPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<StudioStats>(defaultStats);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const liveModules = useMemo(
    () => studioModules.filter((module) => module.status === "live").length,
    []
  );

  const draftModules = useMemo(
    () => studioModules.filter((module) => module.status === "draft").length,
    []
  );

  const groupedModules = useMemo(() => {
    const groups: Array<StudioModule["group"]> = [
      "Behavior",
      "Knowledge",
      "Runtime",
      "Experience",
    ];

    return groups.map((group) => ({
      group,
      modules: studioModules.filter((module) => module.group === group),
    }));
  }, []);

  useEffect(() => {
    void loadStudioData();
  }, []);

  async function loadStudioData() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [
        approvedAnswers,
        cachedAnswers,
        knowledgeItems,
        sessions,
        guardrailLogs,
      ] = await Promise.all([
        getCount("ai_approved_answers", (query) => query.eq("is_active", true)),
        getCount("ai_qa_cache", (query) => query.eq("is_blocked", false)),
        getCount("ai_knowledge_items", (query) =>
          query.eq("is_active", true).eq("status", "active")
        ),
        getCount("ai_conversation_sessions"),
        getCount("ai_admin_activity_logs", (query) =>
          query.in("action_type", [
            "router_guardrail_blocked",
            "router_guardrail_scope_rejected",
            "router_force_refusal",
            "router_controlled_refusal",
          ])
        ),
      ]);

      setStats({
        approvedAnswers,
        cachedAnswers,
        knowledgeItems,
        sessions,
        guardrailLogs,
      });

      const { data, error } = await supabase
        .from("ai_admin_activity_logs")
        .select("id, action_type, entity_type, details, created_at")
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) {
        throw new Error(error.message);
      }

      setActivityLogs((data ?? []) as ActivityLog[]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load AI Studio data."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-6 py-6 text-white">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <Bot className="h-3.5 w-3.5" />
                AI Control Center
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  AI Studio
                </h1>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Manage the live AiXia assistant from one clean control center. Each module has one clear job:
                  behavior, knowledge, runtime, logs, voice, or avatar experience.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusPill label="Live settings" value="Immediate" tone="emerald" />
                <StatusPill label="Publish layer" value="Not needed" tone="slate" />
                <StatusPill label="Draft modules" value={String(draftModules)} tone="amber" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[620px]">
              <MetricCard label="Live Modules" value={String(liveModules)} tone="cyan" />
              <MetricCard label="Draft Modules" value={String(draftModules)} tone="amber" />
              <MetricCard
                label="Status"
                value={loading ? "Loading" : "Ready"}
                tone={loading ? "amber" : "emerald"}
              />
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Approved Answers"
            value={String(stats.approvedAnswers)}
            description="Active exact controlled answers"
            icon={FileCheck2}
            tone="emerald"
          />
          <StatCard
            label="Cache"
            value={String(stats.cachedAnswers)}
            description="Reusable non-blocked replies"
            icon={Sparkles}
            tone="cyan"
          />
          <StatCard
            label="Knowledge"
            value={String(stats.knowledgeItems)}
            description="Active knowledge items"
            icon={Database}
            tone="violet"
          />
          <StatCard
            label="Sessions"
            value={String(stats.sessions)}
            description="Collected AI conversations"
            icon={Brain}
            tone="amber"
          />
          <StatCard
            label="Guardrail Logs"
            value={String(stats.guardrailLogs)}
            description="Visible guard decisions"
            icon={Shield}
            tone="rose"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col gap-6">
            {groupedModules.map((group) => (
              <div
                key={group.group}
                className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl"
              >
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {group.group}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {getGroupDescription(group.group)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 p-5 md:grid-cols-2">
                  {group.modules.map((module) => (
                    <ModuleCard
                      key={module.id}
                      module={module}
                      onOpen={() => {
                        if (module.route) {
                          navigate(module.route);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <aside className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Recent AI Activity
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Latest control-panel and router events.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadStudioData()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              <div className="max-h-[520px] overflow-y-auto">
                {activityLogs.length === 0 ? (
                  <div className="p-5 text-sm text-slate-500">
                    No AI activity yet.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="px-5 py-4">
                        <div className="text-sm font-semibold text-white">
                          {log.action_type}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          {log.entity_type ?? "system"} · {formatDate(log.created_at)}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">
                          {formatDetails(log.details)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),rgba(3,7,18,0.94)_58%)] p-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                <Waves className="h-3.5 w-3.5" />
                Coming Experience Layer
              </div>

              <h2 className="mt-4 text-xl font-semibold text-white">
                Animation / Avatar
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                This replaces Publish / Deploy. You will choose the visual AI assistant people talk to:
                orb, waveform, avatar, robot, hologram, or mascot.
              </p>

              <div className="mt-5 grid gap-3">
                {["Orb", "Waveform", "Face Avatar", "Robot", "Hologram", "Mascot"].map(
                  (item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-300"
                    >
                      {item}
                    </div>
                  )
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

function getGroupDescription(group: StudioModule["group"]) {
  if (group === "Behavior") {
    return "Controls how the assistant behaves, speaks, refuses, and adapts.";
  }

  if (group === "Knowledge") {
    return "Controls what the assistant knows, reuses, and answers exactly.";
  }

  if (group === "Runtime") {
    return "Controls engine settings, sessions, diagnostics, and audit history.";
  }

  return "Controls voice, avatar, and the user-facing assistant experience.";
}

function StatusPill({
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
        : "border-slate-400/20 bg-slate-500/10 text-slate-300";

  return (
    <div className={`rounded-full border px-3 py-1 text-xs ${toneClass}`}>
      <span className="text-white/45">{label}:</span>{" "}
      <span className="font-semibold">{value}</span>
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
  tone: "cyan" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "cyan"
      ? "text-cyan-200"
      : tone === "emerald"
        ? "text-emerald-200"
        : "text-amber-200";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  icon: ElementType;
  tone: "emerald" | "cyan" | "violet" | "amber" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400/15 bg-emerald-500/10 text-emerald-200"
      : tone === "cyan"
        ? "border-cyan-400/15 bg-cyan-500/10 text-cyan-200"
        : tone === "violet"
          ? "border-violet-400/15 bg-violet-500/10 text-violet-200"
          : tone === "amber"
            ? "border-amber-400/15 bg-amber-500/10 text-amber-200"
            : "border-rose-400/15 bg-rose-500/10 text-rose-200";

  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {label}
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
          <div className="mt-2 text-sm leading-5 text-slate-500">
            {description}
          </div>
        </div>

        <div className={`rounded-2xl border p-3 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ModuleCard({
  module,
  onOpen,
}: {
  module: StudioModule;
  onOpen: () => void;
}) {
  const Icon = module.icon;

  const statusClass =
    module.status === "live"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
      : module.status === "ready"
        ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
        : "border-amber-400/20 bg-amber-500/10 text-amber-200";

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!module.route}
      className="group flex min-h-[170px] flex-col justify-between rounded-[26px] border border-white/10 bg-black/20 p-5 text-left transition hover:border-cyan-400/25 hover:bg-white/[0.055] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:border-white/10 disabled:hover:bg-black/20"
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
            <Icon className="h-5 w-5" />
          </div>

          <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusClass}`}>
            {module.status}
          </div>
        </div>

        <div className="mt-4 text-base font-semibold text-white">
          {module.label}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {module.description}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm text-cyan-200">
        <span>{module.route ? "Open module" : "Planned module"}</span>
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </div>
    </button>
  );
}
