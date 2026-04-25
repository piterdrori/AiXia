import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Activity,
  AlertCircle,
  Brain,
  Database,
  FileCheck2,
  Gauge,
  RefreshCcw,
  Search,
  Shield,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type AILog = {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

type LogSection = {
  id: string;
  title: string;
  description: string;
  icon: typeof Activity;
  logs: AILog[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDetails(details: Record<string, unknown>) {
  const keys = Object.keys(details || {});
  if (keys.length === 0) return "No details";

  return keys
    .slice(0, 4)
    .map((key) => `${key}: ${String(details[key])}`)
    .join(" · ");
}

function renderLogRows(logs: AILog[]) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-400">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">No activity found</h3>
          <p className="mt-1 text-xs text-slate-500">
            This section does not have logs yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {logs.map((log) => (
        <div
          key={log.id}
          className="grid gap-4 px-5 py-4 transition hover:bg-white/[0.025] lg:grid-cols-[190px_1fr_170px]"
        >
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/70">
              Action
            </div>
            <div className="mt-1 text-sm font-semibold text-white">
              {log.action_type}
            </div>
            <div className="mt-1 text-xs text-slate-600">{log.entity_type}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-600">
              <Database className="h-3.5 w-3.5" />
              Details
            </div>
            <div className="mt-1 text-sm leading-6 text-slate-300">
              {formatDetails(log.details)}
            </div>
            {log.entity_id && (
              <div className="mt-1 text-xs text-slate-600">
                ID: {log.entity_id}
              </div>
            )}
          </div>

          <div className="text-sm text-slate-500 lg:text-right">
            {formatDate(log.created_at)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AIActivityLogsPage() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState<AILog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return logs;

    return logs.filter((log) => {
      const haystack = [
        log.action_type,
        log.entity_type,
        log.entity_id ?? "",
        JSON.stringify(log.details ?? {}),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [logs, search]);

  const sections = useMemo<LogSection[]>(() => {
    const coreSettingsLogs = filteredLogs.filter(
      (log) => log.entity_type === "ai_setting"
    );

    const knowledgeLogs = filteredLogs.filter(
      (log) => log.entity_type === "knowledge"
    );

    const cacheLogs = filteredLogs.filter(
      (log) =>
        log.entity_type.includes("cache") ||
        log.action_type.includes("cache")
    );

    const approvedLogs = filteredLogs.filter(
      (log) =>
        log.entity_type.includes("approved") ||
        log.action_type.includes("approved")
    );

    const guardrailLogs = filteredLogs.filter(
      (log) =>
        log.entity_type.includes("guardrail") ||
        log.action_type.includes("guardrail")
    );

    const routerLogs = filteredLogs.filter(
      (log) =>
        log.entity_type.includes("router") ||
        log.action_type.includes("router") ||
        log.action_type.includes("fallback")
    );

    const systemLogs = filteredLogs.filter(
      (log) =>
        !coreSettingsLogs.some((item) => item.id === log.id) &&
        !knowledgeLogs.some((item) => item.id === log.id) &&
        !cacheLogs.some((item) => item.id === log.id) &&
        !approvedLogs.some((item) => item.id === log.id) &&
        !guardrailLogs.some((item) => item.id === log.id) &&
        !routerLogs.some((item) => item.id === log.id)
    );

    return [
      {
        id: "core-settings",
        title: "Core Settings Logs",
        description: "Runtime setting changes and AI behavior controls.",
        icon: Gauge,
        logs: coreSettingsLogs,
      },
      {
        id: "knowledge",
        title: "Knowledge Logs",
        description: "Knowledge create, update, archive, upload, and delete actions.",
        icon: Database,
        logs: knowledgeLogs,
      },
      {
        id: "cache",
        title: "Cache Logs",
        description: "Cache review, feedback, promotion, and cleanup actions.",
        icon: Brain,
        logs: cacheLogs,
      },
      {
        id: "approved",
        title: "Approved Answers Logs",
        description: "Approved answer creation, edits, promotion, and removal.",
        icon: FileCheck2,
        logs: approvedLogs,
      },
      {
        id: "guardrails",
        title: "Guardrails Logs",
        description: "Blocked topics, allowed-scope rejections, and safety actions.",
        icon: Shield,
        logs: guardrailLogs,
      },
      {
        id: "router",
        title: "Router / System Logs",
        description: "Router decisions, fallback behavior, and system-level AI events.",
        icon: Activity,
        logs: routerLogs,
      },
      {
        id: "other",
        title: "Other Logs",
        description: "Unclassified or future AI activity records.",
        icon: AlertCircle,
        logs: systemLogs,
      },
    ];
  }, [filteredLogs]);

  const metrics = useMemo(() => {
    const total = logs.length;
    const settingsChanges = logs.filter(
      (log) => log.entity_type === "ai_setting"
    ).length;
    const knowledgeChanges = logs.filter(
      (log) => log.entity_type === "knowledge"
    ).length;
    const errors = logs.filter((log) =>
      log.action_type.toLowerCase().includes("error")
    ).length;

    return {
      total,
      settingsChanges,
      knowledgeChanges,
      errors,
    };
  }, [logs]);

  useEffect(() => {
    void loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("ai_admin_activity_logs")
      .select("id, action_type, entity_type, entity_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setLogs((data ?? []) as AILog[]);
    setLoading(false);
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
                  <Activity className="h-3.5 w-3.5" />
                  Audit Layer
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                    Activity & Logs
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Review AI settings changes, knowledge updates, cache actions,
                    approved answers, guardrails, router events, and system audit history.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 lg:min-w-[720px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Total
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {metrics.total}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Settings
                </p>
                <p className="mt-2 text-3xl font-semibold text-cyan-200">
                  {metrics.settingsChanges}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Knowledge
                </p>
                <p className="mt-2 text-3xl font-semibold text-emerald-200">
                  {metrics.knowledgeChanges}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Errors
                </p>
                <p className="mt-2 text-3xl font-semibold text-rose-200">
                  {metrics.errors}
                </p>
              </div>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {errorMessage}
          </div>
        )}

        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Activity Control
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Latest 200 AI admin activity records, grouped by module.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex min-w-[280px] items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search logs..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                />
              </div>

              <button
                type="button"
                onClick={() => void loadLogs()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-sm text-slate-400">
              Loading activity logs...
            </div>
          ) : (
            <div className="grid gap-5 p-5">
              {sections.map((section) => {
                const Icon = section.icon;

                return (
                  <div
                    key={section.id}
                    className="overflow-hidden rounded-[26px] border border-white/10 bg-black/20"
                  >
                    <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                          <Icon className="h-5 w-5" />
                        </div>

                        <div>
                          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                            {section.title}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {section.description}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/70">
                        {section.logs.length} logs
                      </div>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                      {renderLogRows(section.logs)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
