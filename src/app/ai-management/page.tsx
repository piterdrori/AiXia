import { supabase } from "@/lib/supabase";
import { AixiaCommandMetrics, AixiaHero, AixiaPage, AixiaWorkspaceCard } from "@/components/aixia";
import type { AixiaCommandMetricItem } from "@/components/aixia";
import "@/styles/dashboard/tokens.css";
import "@/styles/dashboard/layout.css";
import "@/styles/dashboard/visual.css";

import { useNavigate } from "react-router-dom";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Brain,
  Database,
  FileCheck2,
  Gauge,
  Mic,
  MessageSquareText,
  RefreshCcw,
  RotateCcw,
  Send,
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
  icon: LucideIcon;
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

type PreviewDebugCandidate = {
  id?: string;
  question?: string;
  similarity?: number;
  rank_score?: number;
  usage_count?: number;
  quality_score?: number;
};

type PreviewDebug = {
  reason?: string;
  layer?: string;
  note?: string;
  threshold?: number;
  totalCache?: number;
  avgUsage?: number;
  character_enabled?: boolean;
  state_of_mind_enabled?: boolean;
  state_mode?: string;
  guardrail_master_enabled?: boolean;
  weak_answer_guard_enabled?: boolean;
  weak_answer_strictness?: number;
  min_openai_length?: number;
  cache_guard_enabled?: boolean;
  auto_learning_guard_enabled?: boolean;
  selected?: PreviewDebugCandidate;
  candidates?: PreviewDebugCandidate[];
};

type PreviewMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  similarity?: number;
  matchedQuestion?: string;
  sourceQuestion?: string;
  debug?: PreviewDebug;
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
      "Live TTS/STT control layer for speaking, listening, sessions, and avatar testing.",
    route: "/ai-management/voice",
    icon: Mic,
    status: "live",
    group: "Experience",
  },
   {
    id: "animation",
    label: "Animation / Avatar",
    description:
      "Visual assistant layer: orb, waveform, avatar, robot, hologram, or mascot states for AiXia.",
    route: "/ai-management/animation",
    icon: Waves,
    status: "live",
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

  const [previewInput, setPreviewInput] = useState("");
  const [previewMessages, setPreviewMessages] = useState<PreviewMessage[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewMessagesRef = useRef<HTMLDivElement | null>(null);

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

  const commandHeaderMetrics = useMemo<AixiaCommandMetricItem[]>(
    () => [
      { key: "live-modules-0", title: "Live Modules", value: String(String(liveModules)), tone: "cyan" },
      { key: "draft-modules-1", title: "Draft Modules", value: String(String(draftModules)), tone: "amber" },
    ],
    [liveModules, draftModules]
  );

  useEffect(() => {
    if (!previewMessagesRef.current) return;

    previewMessagesRef.current.scrollTo({
      top: previewMessagesRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [previewMessages, previewLoading]);

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

  async function sendPreviewMessage() {
    const prompt = previewInput.trim();

    if (!prompt || previewLoading) return;

    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();

    setPreviewInput("");
    setPreviewError(null);
    setPreviewLoading(true);

    setPreviewMessages((current) => [
      ...current,
      {
        id: userMessageId,
        role: "user",
        content: prompt,
      },
    ]);

    const { data, error } = await supabase.functions.invoke("ai-router", {
      body: { prompt },
    });

    if (error) {
      setPreviewError(error.message);
      setPreviewLoading(false);
      return;
    }

    setPreviewMessages((current) => [
      ...current,
      {
        id: assistantMessageId,
        role: "assistant",
        content: data?.text ?? "No response returned.",
        provider: data?.provider,
        similarity: data?.similarity,
        matchedQuestion: data?.matched_question,
        sourceQuestion: prompt,
        debug: data?.debug,
      },
    ]);

    setPreviewLoading(false);
  }

  function startNewPreviewChat() {
    setPreviewMessages([]);
    setPreviewError(null);
    setPreviewLoading(false);
    setPreviewInput("");
  }

  return (
    <AixiaPage surface="command" className="aixia-command-page aixia-ai-management-page"><AixiaHero
        surface="command"
        className="shrink-0 space-y-4"
        
        gradientTitle="AI Studio"
        title="AI Studio"
        subtitle="Manage the live AiXia assistant from one clean control center. Each module has one clear job: behavior, knowledge, runtime, logs, voice, or avatar experience."
      >
        <AixiaCommandMetrics items={commandHeaderMetrics} />
      </AixiaHero>

      <div className="aixia-command-scroll flex flex-col gap-6">

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

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
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
                    <AixiaWorkspaceCard
                      key={module.id}
                      label={module.label}
                      eyebrow={group.group}
                      description={module.description}
                      icon={module.icon}
                      statusLabel={module.status.toUpperCase()}
                      summary={module.route ? "Open module" : "Planned module"}
                      tone={getModuleTone(module.status)}
                      disabled={!module.route}
                      onClick={() => {
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
            <LiveTestConsole
              previewInput={previewInput}
              previewMessages={previewMessages}
              previewLoading={previewLoading}
              previewError={previewError}
              previewMessagesRef={previewMessagesRef}
              onInputChange={setPreviewInput}
              onSend={() => void sendPreviewMessage()}
              onNew={startNewPreviewChat}
            />

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
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              <div className="max-h-[380px] overflow-y-auto">
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
                This replaces Publish / Deploy. You will choose the visual AI assistant
                people talk to: orb, waveform, avatar, robot, hologram, or mascot.
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
    </AixiaPage>
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
  icon: LucideIcon;
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

function getModuleTone(status: StudioModule["status"]) {
  if (status === "live") return "emerald" as const;
  if (status === "ready") return "cyan" as const;
  return "amber" as const;
}

function LiveTestConsole({
  previewInput,
  previewMessages,
  previewLoading,
  previewError,
  previewMessagesRef,
  onInputChange,
  onSend,
  onNew,
}: {
  previewInput: string;
  previewMessages: PreviewMessage[];
  previewLoading: boolean;
  previewError: string | null;
  previewMessagesRef: RefObject<HTMLDivElement | null>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onNew: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Live Test Console
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Test the live ai-router with Router Debug visible in the chat.
          </p>
        </div>

        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
          New
        </button>
      </div>

      <div className="flex min-h-[540px] flex-col">
        <div
          ref={previewMessagesRef}
          className="h-[405px] space-y-3 overflow-y-auto px-4 py-4 overscroll-contain scroll-smooth"
        >
          {previewMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-center text-sm leading-6 text-slate-500">
              Ask a test question to verify Approved Answers, Cache, OpenAI fallback,
              Character, State of Mind, Guardrails, and Router Debug.
            </div>
          ) : (
            previewMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-cyan-500/15 text-cyan-100"
                      : "border border-white/10 bg-white/[0.04] text-white/80"
                  }`}
                >
                  <div>{message.content}</div>

                  {message.role === "assistant" ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/45">
                      {message.provider ? (
                        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5">
                          {message.provider}
                        </span>
                      ) : null}

                      {typeof message.similarity === "number" ? (
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-cyan-200">
                          sim {message.similarity.toFixed(3)}
                        </span>
                      ) : null}

                      {message.matchedQuestion ? (
                        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5">
                          matched cache
                        </span>
                      ) : null}

                      {message.debug ? (
                        <RouterDebugPanel debug={message.debug} />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}

          {previewLoading ? (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-400">
                Thinking...
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/10 p-4">
          {previewError ? (
            <div className="mb-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {previewError}
            </div>
          ) : null}

          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <input
              value={previewInput}
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSend();
                }
              }}
              placeholder="Test the live AI router..."
              className="min-w-0 flex-1 bg-transparent text-sm text-white/80 outline-none placeholder:text-white/35"
            />

            <button
              type="button"
              onClick={onSend}
              disabled={previewLoading || !previewInput.trim()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500 text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RouterDebugPanel({ debug }: { debug: PreviewDebug }) {
  return (
    <div className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-200/80">
        Router Debug
      </div>

      <div className="grid gap-2 text-[11px] text-white/55">
        {debug.reason ? <DebugRow label="Reason" value={debug.reason} /> : null}
        {debug.layer ? <DebugRow label="Layer" value={debug.layer} /> : null}
        {debug.note ? <DebugRow label="Note" value={debug.note} /> : null}

        {typeof debug.threshold === "number" ? (
          <DebugRow label="Threshold" value={debug.threshold.toFixed(3)} />
        ) : null}

        {typeof debug.totalCache === "number" ? (
          <DebugRow label="Total cache" value={String(debug.totalCache)} />
        ) : null}

        {typeof debug.character_enabled === "boolean" ? (
          <DebugRow
            label="Character"
            value={debug.character_enabled ? "enabled" : "disabled"}
          />
        ) : null}

        {typeof debug.state_of_mind_enabled === "boolean" ? (
          <DebugRow
            label="State of Mind"
            value={debug.state_of_mind_enabled ? "enabled" : "disabled"}
          />
        ) : null}

        {debug.state_mode ? (
          <DebugRow label="State mode" value={debug.state_mode} />
        ) : null}

        {typeof debug.guardrail_master_enabled === "boolean" ? (
          <DebugRow
            label="Guardrails"
            value={debug.guardrail_master_enabled ? "enabled" : "disabled"}
          />
        ) : null}

        {typeof debug.weak_answer_guard_enabled === "boolean" ? (
          <DebugRow
            label="Weak Answer Guard"
            value={debug.weak_answer_guard_enabled ? "enabled" : "disabled"}
          />
        ) : null}

        {typeof debug.weak_answer_strictness === "number" ? (
          <DebugRow
            label="Weak Strictness"
            value={String(debug.weak_answer_strictness)}
          />
        ) : null}

        {typeof debug.min_openai_length === "number" ? (
          <DebugRow
            label="Min Answer Length"
            value={String(debug.min_openai_length)}
          />
        ) : null}

        {typeof debug.cache_guard_enabled === "boolean" ? (
          <DebugRow
            label="Cache Guard"
            value={debug.cache_guard_enabled ? "enabled" : "disabled"}
          />
        ) : null}

        {typeof debug.auto_learning_guard_enabled === "boolean" ? (
          <DebugRow
            label="Auto-Learning Guard"
            value={debug.auto_learning_guard_enabled ? "enabled" : "disabled"}
          />
        ) : null}

        {debug.selected ? (
          <div className="rounded-xl border border-cyan-400/15 bg-cyan-500/10 p-2 text-cyan-100/80">
            <div className="text-[11px] text-cyan-200">Selected</div>
            <div className="mt-1">{debug.selected.question}</div>
            <div className="mt-1 text-cyan-100/55">
              sim{" "}
              {typeof debug.selected.similarity === "number"
                ? debug.selected.similarity.toFixed(3)
                : "n/a"}{" "}
              · rank{" "}
              {typeof debug.selected.rank_score === "number"
                ? debug.selected.rank_score.toFixed(3)
                : "n/a"}{" "}
              · usage {debug.selected.usage_count ?? 0} · quality{" "}
              {debug.selected.quality_score ?? 0}
            </div>
          </div>
        ) : null}

        {debug.candidates && debug.candidates.length > 0 ? (
          <div className="space-y-1">
            <div className="text-[11px] text-white/35">Candidates</div>
            {debug.candidates.map((candidate, candidateIndex) => (
              <div
                key={candidate.id ?? `${candidate.question}-${candidateIndex}`}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-2"
              >
                <div className="line-clamp-1">{candidate.question}</div>
                <div className="mt-1 text-white/35">
                  sim{" "}
                  {typeof candidate.similarity === "number"
                    ? candidate.similarity.toFixed(3)
                    : "n/a"}{" "}
                  · rank{" "}
                  {typeof candidate.rank_score === "number"
                    ? candidate.rank_score.toFixed(3)
                    : "n/a"}{" "}
                  · usage {candidate.usage_count ?? 0} · quality{" "}
                  {candidate.quality_score ?? 0}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-white/35">{label}:</span> {value}
    </div>
  );
}
