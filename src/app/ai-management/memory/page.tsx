import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Database,
  MessageSquareText,
  RefreshCcw,
  Search,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Wand2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type AISession = {
  id: string;
  title: string | null;
  source: string;
  status: string;
  quality_score: number | null;
  summary: string | null;
  insights: Record<string, unknown>;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

type AIMessage = {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  provider: string | null;
  model: string | null;
  router_layer: string | null;
  router_reason: string | null;
  matched_question: string | null;
  similarity: number | null;
  feedback: "liked" | "disliked" | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type SessionInsight = {
  id: string;
  session_id: string;
  insight_type: string;
  severity: string;
  title: string;
  description: string;
  recommended_action: string | null;
  metadata: Record<string, unknown>;
  is_resolved: boolean;
  created_at: string;
};

type SessionHealth = {
  score: number;
  likedCount: number;
  dislikedCount: number;
  errorCount: number;
  refusalCount: number;
  approvedCount: number;
  cacheCount: number;
  openAiCount: number;
  messageCount: number;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().trim();
}

function calculateSessionHealth(messages: AIMessage[]): SessionHealth {
  const assistantMessages = messages.filter((message) => message.role === "assistant");

  const likedCount = assistantMessages.filter(
    (message) => message.feedback === "liked"
  ).length;

  const dislikedCount = assistantMessages.filter(
    (message) => message.feedback === "disliked"
  ).length;

  const errorCount = assistantMessages.filter(
    (message) =>
      message.router_layer === "error" ||
      message.provider === "client-error" ||
      normalizeText(message.content).includes("edge function returned")
  ).length;

  const refusalCount = assistantMessages.filter((message) => {
    const content = normalizeText(message.content);
    return (
      content.includes("i do not have an approved answer") ||
      content.includes("outside allowed scope") ||
      content.includes("not allowed")
    );
  }).length;

  const approvedCount = assistantMessages.filter(
    (message) => message.router_layer === "approved"
  ).length;

  const cacheCount = assistantMessages.filter(
    (message) =>
      message.router_layer === "exact-cache" ||
      message.router_layer === "semantic-cache" ||
      message.provider === "cache" ||
      message.provider === "semantic-cache"
  ).length;

  const openAiCount = assistantMessages.filter(
    (message) => message.router_layer === "openai"
  ).length;

  let score = 100;
  score -= dislikedCount * 20;
  score -= errorCount * 25;
  score -= refusalCount * 12;
  score += likedCount * 8;
  score += approvedCount * 5;
  score += cacheCount * 3;

  if (assistantMessages.length === 0) {
    score = 0;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    likedCount,
    dislikedCount,
    errorCount,
    refusalCount,
    approvedCount,
    cacheCount,
    openAiCount,
    messageCount: messages.length,
  };
}

function getHealthLabel(score: number) {
  if (score >= 85) return "Strong";
  if (score >= 65) return "Needs Review";
  if (score >= 40) return "Weak";
  return "Critical";
}

function getHealthTone(score: number) {
  if (score >= 85) return "text-emerald-200";
  if (score >= 65) return "text-amber-200";
  if (score >= 40) return "text-orange-200";
  return "text-rose-200";
}

function getSessionTitle(session: AISession) {
  return session.title?.trim() || "Untitled AI Session";
}

export default function AIMemoryPage() {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<AISession[]>([]);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [insights, setInsights] = useState<SessionInsight[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ended">(
    "all"
  );
  const [qualityFilter, setQualityFilter] = useState<
    "all" | "strong" | "review" | "weak"
  >("all");

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions]
  );

  const selectedHealth = useMemo(
    () => calculateSessionHealth(messages),
    [messages]
  );

  const sessionsWithHealth = useMemo(() => {
    return sessions.map((session) => {
      const sessionMessages =
        session.id === selectedSessionId ? messages : [];

      const score =
        typeof session.quality_score === "number"
          ? session.quality_score
          : session.id === selectedSessionId
            ? calculateSessionHealth(sessionMessages).score
            : null;

      return {
        session,
        score,
      };
    });
  }, [messages, selectedSessionId, sessions]);

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sessionsWithHealth.filter(({ session, score }) => {
      const matchesSearch =
        !query ||
        getSessionTitle(session).toLowerCase().includes(query) ||
        session.source.toLowerCase().includes(query) ||
        session.status.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || session.status === statusFilter;

      const normalizedScore = score ?? 100;

      const matchesQuality =
        qualityFilter === "all" ||
        (qualityFilter === "strong" && normalizedScore >= 85) ||
        (qualityFilter === "review" &&
          normalizedScore >= 65 &&
          normalizedScore < 85) ||
        (qualityFilter === "weak" && normalizedScore < 65);

      return matchesSearch && matchesStatus && matchesQuality;
    });
  }, [qualityFilter, search, sessionsWithHealth, statusFilter]);

  const metrics = useMemo(() => {
    const total = sessions.length;
    const active = sessions.filter((session) => session.status === "active").length;
    const ended = sessions.filter((session) => session.status === "ended").length;
    const reviewed = sessions.filter(
      (session) => typeof session.quality_score === "number"
    ).length;

    return {
      total,
      active,
      ended,
      reviewed,
    };
  }, [sessions]);

  const selectedUserMessages = useMemo(
    () => messages.filter((message) => message.role === "user"),
    [messages]
  );

  const selectedAssistantMessages = useMemo(
    () => messages.filter((message) => message.role === "assistant"),
    [messages]
  );

  useEffect(() => {
    void loadSessions();
  }, []);

  useEffect(() => {
    if (!selectedSessionId) return;
    void loadSessionDetails(selectedSessionId);
  }, [selectedSessionId]);

  async function loadSessions() {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("ai_conversation_sessions")
      .select(
        "id, title, source, status, quality_score, summary, insights, started_at, ended_at, created_at, updated_at"
      )
      .order("started_at", { ascending: false })
      .limit(100);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as AISession[];

    setSessions(rows);

    if (!selectedSessionId && rows.length > 0) {
      setSelectedSessionId(rows[0].id);
    }

    setLoading(false);
  }

  async function loadSessionDetails(sessionId: string) {
    setLoadingMessages(true);
    setErrorMessage(null);

    const [{ data: messageData, error: messageError }, { data: insightData }] =
      await Promise.all([
        supabase
          .from("ai_conversation_messages")
          .select(
            "id, session_id, role, content, provider, model, router_layer, router_reason, matched_question, similarity, feedback, metadata, created_at"
          )
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true }),
        supabase
          .from("ai_session_insights")
          .select(
            "id, session_id, insight_type, severity, title, description, recommended_action, metadata, is_resolved, created_at"
          )
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false }),
      ]);

    if (messageError) {
      setErrorMessage(messageError.message);
      setLoadingMessages(false);
      return;
    }

    setMessages((messageData ?? []) as AIMessage[]);
    setInsights((insightData ?? []) as SessionInsight[]);
    setLoadingMessages(false);
  }

  async function analyzeSelectedSession() {
    if (!selectedSession) return;

    const health = calculateSessionHealth(messages);

    const generatedInsights: Array<{
      insight_type: string;
      severity: string;
      title: string;
      description: string;
      recommended_action: string;
      metadata: Record<string, unknown>;
    }> = [];

    if (health.errorCount > 0) {
      generatedInsights.push({
        insight_type: "router_error",
        severity: "critical",
        title: "Router or client error detected",
        description:
          "This session contains one or more assistant responses that failed through the client or Edge Function path.",
        recommended_action:
          "Review router logs and fix the failing provider, Edge Function, or client-side request path.",
        metadata: {
          error_count: health.errorCount,
        },
      });
    }

    if (health.dislikedCount > 0) {
      generatedInsights.push({
        insight_type: "negative_feedback",
        severity: "warning",
        title: "Negative feedback received",
        description:
          "The user marked one or more assistant responses as bad. This indicates the response may need an approved answer, better knowledge, or a router rule.",
        recommended_action:
          "Review disliked messages and decide whether to create an approved answer, update knowledge, or adjust guardrails.",
        metadata: {
          disliked_count: health.dislikedCount,
        },
      });
    }

    if (health.refusalCount > 0) {
      generatedInsights.push({
        insight_type: "refusal_review",
        severity: "warning",
        title: "Refusal or no-answer response detected",
        description:
          "The assistant refused or returned no approved answer during this session.",
        recommended_action:
          "If the request is valid, create an approved answer or add supporting knowledge. If invalid, keep guardrails as-is.",
        metadata: {
          refusal_count: health.refusalCount,
        },
      });
    }

    if (health.openAiCount > health.approvedCount + health.cacheCount) {
      generatedInsights.push({
        insight_type: "approval_candidate",
        severity: "info",
        title: "OpenAI fallback used often",
        description:
          "This session relied more on OpenAI fallback than approved answers or cache.",
        recommended_action:
          "Promote repeated stable responses into Approved Answers or Cache Review.",
        metadata: {
          openai_count: health.openAiCount,
          approved_count: health.approvedCount,
          cache_count: health.cacheCount,
        },
      });
    }

    if (generatedInsights.length === 0) {
      generatedInsights.push({
        insight_type: "healthy_session",
        severity: "info",
        title: "Session looks healthy",
        description:
          "No major errors, refusals, or negative feedback were detected in this session.",
        recommended_action:
          "No immediate action needed. Continue monitoring future sessions.",
        metadata: {
          score: health.score,
        },
      });
    }

    await supabase
      .from("ai_session_insights")
      .delete()
      .eq("session_id", selectedSession.id);

    const { error: insertError } = await supabase
      .from("ai_session_insights")
      .insert(
        generatedInsights.map((insight) => ({
          session_id: selectedSession.id,
          ...insight,
        }))
      );

    if (insertError) {
      setErrorMessage(insertError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("ai_conversation_sessions")
      .update({
        quality_score: health.score,
        summary: buildSessionSummary(messages, health),
        insights: {
          score: health.score,
          liked_count: health.likedCount,
          disliked_count: health.dislikedCount,
          error_count: health.errorCount,
          refusal_count: health.refusalCount,
          approved_count: health.approvedCount,
          cache_count: health.cacheCount,
          openai_count: health.openAiCount,
          message_count: health.messageCount,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedSession.id);

    if (updateError) {
      setErrorMessage(updateError.message);
      return;
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "ai_session_analyzed",
      entity_type: "memory",
      entity_id: selectedSession.id,
      details: {
        quality_score: health.score,
        insight_count: generatedInsights.length,
        title: getSessionTitle(selectedSession),
      },
    });

    await loadSessions();
    await loadSessionDetails(selectedSession.id);
  }

  function buildSessionSummary(sessionMessages: AIMessage[], health: SessionHealth) {
    const userQuestions = sessionMessages
      .filter((message) => message.role === "user")
      .map((message) => message.content)
      .slice(0, 5);

    if (userQuestions.length === 0) {
      return "No user questions were recorded in this session.";
    }

    return `Session included ${userQuestions.length} user question(s). Quality score: ${health.score}/100. Main questions: ${userQuestions.join(" | ")}`;
  }

  async function endSelectedSession() {
    if (!selectedSession) return;

    const { error } = await supabase
      .from("ai_conversation_sessions")
      .update({
        status: "ended",
        ended_at: selectedSession.ended_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedSession.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "ai_session_ended",
      entity_type: "memory",
      entity_id: selectedSession.id,
      details: {
        title: getSessionTitle(selectedSession),
        source: selectedSession.source,
      },
    });

    await loadSessions();
    await loadSessionDetails(selectedSession.id);
  }

  async function deleteSelectedSession() {
    if (!selectedSession) return;

    const confirmed = window.confirm(
      `Delete session "${getSessionTitle(selectedSession)}" permanently?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("ai_conversation_sessions")
      .delete()
      .eq("id", selectedSession.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "ai_session_deleted",
      entity_type: "memory",
      entity_id: selectedSession.id,
      details: {
        title: getSessionTitle(selectedSession),
        source: selectedSession.source,
      },
    });

    setSelectedSessionId(null);
    setMessages([]);
    setInsights([]);
    await loadSessions();
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
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-purple-200">
                  <Brain className="h-3.5 w-3.5" />
                  Session Intelligence Layer
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                    Memory / Session Intelligence
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Review real AI conversations, router behavior, feedback, refusals, errors, and quality signals collected from the floating AI assistant.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 lg:min-w-[720px]">
              <MetricCard label="Sessions" value={String(metrics.total)} tone="white" />
              <MetricCard label="Active" value={String(metrics.active)} tone="emerald" />
              <MetricCard label="Ended" value={String(metrics.ended)} tone="cyan" />
              <MetricCard label="Reviewed" value={String(metrics.reviewed)} tone="amber" />
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {errorMessage}
          </div>
        ) : null}

                <section className="grid gap-4 md:grid-cols-3">
          <PurposeCard
            icon={MessageSquareText}
            title="Conversation Capture"
            description="Collects real AI sessions from the floating assistant, including user messages, assistant replies, provider, model, and router path."
          />

          <PurposeCard
            icon={Wand2}
            title="Quality Analysis"
            description="Scores each session based on feedback, refusals, errors, approved-answer use, cache use, and OpenAI fallback use."
          />

          <PurposeCard
            icon={Sparkles}
            title="Improvement Signals"
            description="Identifies missing approved answers, weak knowledge coverage, negative feedback, and router problems."
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(420px,0.9fr)_minmax(0,1.1fr)]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Captured Sessions
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Sessions collected from the real floating AI assistant.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadSessions()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search session title, source, status..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-9 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-400/40 focus:outline-none"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "all" | "active" | "ended")
                  }
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-300 focus:border-purple-400/40 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="ended">Ended</option>
                </select>

                <select
                  value={qualityFilter}
                  onChange={(event) =>
                    setQualityFilter(
                      event.target.value as "all" | "strong" | "review" | "weak"
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-300 focus:border-purple-400/40 focus:outline-none"
                >
                  <option value="all">All Quality</option>
                  <option value="strong">Strong</option>
                  <option value="review">Needs Review</option>
                  <option value="weak">Weak / Critical</option>
                </select>
              </div>
            </div>

            <div className="max-h-[720px] overflow-y-auto">
              {loading ? (
                <div className="px-5 py-6 text-sm text-slate-400">
                  Loading sessions...
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-500">
                  No sessions found.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredSessions.map(({ session, score }) => {
                    const isSelected = session.id === selectedSessionId;
                    const displayScore = score ?? session.quality_score ?? null;

                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => setSelectedSessionId(session.id)}
                        className={`w-full px-5 py-4 text-left transition ${
                          isSelected ? "bg-purple-500/10" : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {getSessionTitle(session)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {session.source} • {session.status} • {formatDate(session.started_at)}
                            </p>
                            {session.summary ? (
                              <p className="line-clamp-2 text-sm leading-6 text-slate-400">
                                {session.summary}
                              </p>
                            ) : (
                              <p className="text-sm text-slate-600">
                                Not analyzed yet.
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 text-right">
                            {displayScore === null ? (
                              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-400">
                                New
                              </div>
                            ) : (
                              <>
                                <div className={`text-lg font-semibold ${getHealthTone(displayScore)}`}>
                                  {displayScore}
                                </div>
                                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-600">
                                  {getHealthLabel(displayScore)}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Session Inspector
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedSession
                      ? getSessionTitle(selectedSession)
                      : "Select a session to inspect."}
                  </p>
                </div>

                {selectedSession ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void analyzeSelectedSession()}
                      className="inline-flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-200 transition hover:border-purple-300/60 hover:bg-purple-500/20"
                    >
                      <Sparkles className="h-4 w-4" />
                      Analyze
                    </button>

                    {selectedSession.status !== "ended" ? (
                      <button
                        type="button"
                        onClick={() => void endSelectedSession()}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
                      >
                        End
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void deleteSelectedSession()}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>

              {!selectedSession ? (
                <div className="px-5 py-10 text-sm text-slate-500">
                  No session selected.
                </div>
              ) : loadingMessages ? (
                <div className="px-5 py-10 text-sm text-slate-400">
                  Loading session details...
                </div>
              ) : (
                <div className="grid gap-4 p-5">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <HealthMetric
                      icon={CheckCircle2}
                      label="Score"
                      value={`${selectedHealth.score}/100`}
                      tone={getHealthTone(selectedHealth.score)}
                    />
                    <HealthMetric
                      icon={ThumbsUp}
                      label="Liked"
                      value={String(selectedHealth.likedCount)}
                      tone="text-emerald-200"
                    />
                    <HealthMetric
                      icon={ThumbsDown}
                      label="Bad"
                      value={String(selectedHealth.dislikedCount)}
                      tone="text-rose-200"
                    />
                    <HealthMetric
                      icon={ShieldAlert}
                      label="Refusals"
                      value={String(selectedHealth.refusalCount)}
                      tone="text-amber-200"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <HealthMetric
                      icon={Database}
                      label="Approved"
                      value={String(selectedHealth.approvedCount)}
                      tone="text-cyan-200"
                    />
                    <HealthMetric
                      icon={Database}
                      label="Cache"
                      value={String(selectedHealth.cacheCount)}
                      tone="text-emerald-200"
                    />
                    <HealthMetric
                      icon={Brain}
                      label="OpenAI"
                      value={String(selectedHealth.openAiCount)}
                      tone="text-purple-200"
                    />
                    <HealthMetric
                      icon={XCircle}
                      label="Errors"
                      value={String(selectedHealth.errorCount)}
                      tone="text-rose-200"
                    />
                  </div>

                                    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                    <div className="border-b border-white/10 px-4 py-3">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Conversation Transcript
                      </h3>
                    </div>

                    <div className="max-h-[420px] space-y-3 overflow-y-auto p-4">
                      {messages.length === 0 ? (
                        <div className="text-sm text-slate-500">
                          No messages recorded for this session.
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.role === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                                message.role === "user"
                                  ? "bg-cyan-500/15 text-cyan-100"
                                  : "border border-white/10 bg-white/[0.04] text-white/85"
                              }`}
                            >
                              <div>{message.content}</div>

                              {message.role === "assistant" ? (
                                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-white/45">
                                  {message.provider ? (
                                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5">
                                      {message.provider}
                                    </span>
                                  ) : null}

                                  {message.router_layer ? (
                                    <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-2 py-0.5 text-purple-200">
                                      {message.router_layer}
                                    </span>
                                  ) : null}

                                  {message.router_reason ? (
                                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5">
                                      {message.router_reason}
                                    </span>
                                  ) : null}

                                  {message.feedback ? (
                                    <span
                                      className={`rounded-full border px-2 py-0.5 ${
                                        message.feedback === "liked"
                                          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                                          : "border-rose-400/20 bg-rose-500/10 text-rose-300"
                                      }`}
                                    >
                                      {message.feedback}
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                      <div className="border-b border-white/10 px-4 py-3">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          User Questions
                        </h3>
                      </div>

                      <div className="max-h-[260px] overflow-y-auto p-4">
                        {selectedUserMessages.length === 0 ? (
                          <div className="text-sm text-slate-500">
                            No user messages.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedUserMessages.map((message) => (
                              <div
                                key={message.id}
                                className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 py-3 text-sm leading-6 text-cyan-100/90"
                              >
                                {message.content}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                      <div className="border-b border-white/10 px-4 py-3">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Assistant Answers
                        </h3>
                      </div>

                      <div className="max-h-[260px] overflow-y-auto p-4">
                        {selectedAssistantMessages.length === 0 ? (
                          <div className="text-sm text-slate-500">
                            No assistant messages.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedAssistantMessages.map((message) => (
                              <div
                                key={message.id}
                                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-slate-300"
                              >
                                <div>{message.content}</div>
                                <div className="mt-2 text-[10px] text-slate-600">
                                  {message.provider ?? "n/a"} •{" "}
                                  {message.router_layer ?? "no layer"} •{" "}
                                  {message.feedback ?? "no feedback"}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                    <div className="border-b border-white/10 px-4 py-3">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        AI Session Insights
                      </h3>
                    </div>

                    <div className="max-h-[320px] overflow-y-auto p-4">
                      {insights.length === 0 ? (
                        <div className="text-sm leading-6 text-slate-500">
                          No insights yet. Click Analyze to generate quality signals for this session.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {insights.map((insight) => (
                            <div
                              key={insight.id}
                              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-white">
                                    {insight.title}
                                  </div>
                                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-600">
                                    {insight.insight_type} • {insight.severity}
                                  </div>
                                </div>

                                {insight.is_resolved ? (
                                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300">
                                    resolved
                                  </span>
                                ) : (
                                  <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">
                                    open
                                  </span>
                                )}
                              </div>

                              <p className="mt-3 text-sm leading-6 text-slate-400">
                                {insight.description}
                              </p>

                              {insight.recommended_action ? (
                                <div className="mt-3 rounded-xl border border-purple-400/15 bg-purple-500/10 px-3 py-2 text-sm leading-6 text-purple-100/80">
                                  {insight.recommended_action}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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
  tone: "emerald" | "amber" | "cyan" | "white";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-200"
      : tone === "amber"
        ? "text-amber-200"
        : tone === "cyan"
          ? "text-cyan-200"
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
        <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-3 text-purple-200">
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

function HealthMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Brain;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</div>
    </div>
  );
}
