import { useEffect, useMemo, useState } from "react";
import {
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
import { AixiaCommandMetrics, AixiaHero, AixiaPage } from "@/components/aixia";
import type { AixiaCommandMetricItem } from "@/components/aixia";
import "@/styles/dashboard/tokens.css";
import "@/styles/dashboard/layout.css";
import "@/styles/dashboard/visual.css";


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
  tone: "cyan" | "emerald" | "violet" | "amber" | "rose" | "slate";
  logs: AILog[];
};

type LogTone = LogSection["tone"];

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

function toneClasses(tone: LogTone) {
  if (tone === "emerald") {
    return {
      icon: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
      chip: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
      line: "bg-emerald-400/40",
    };
  }

  if (tone === "violet") {
    return {
      icon: "border-violet-400/20 bg-violet-500/10 text-violet-200",
      chip: "border-violet-400/20 bg-violet-500/10 text-violet-200",
      line: "bg-violet-400/40",
    };
  }

  if (tone === "amber") {
    return {
      icon: "border-amber-400/20 bg-amber-500/10 text-amber-200",
      chip: "border-amber-400/20 bg-amber-500/10 text-amber-200",
      line: "bg-amber-400/40",
    };
  }

  if (tone === "rose") {
    return {
      icon: "border-rose-400/20 bg-rose-500/10 text-rose-200",
      chip: "border-rose-400/20 bg-rose-500/10 text-rose-200",
      line: "bg-rose-400/40",
    };
  }

  if (tone === "slate") {
    return {
      icon: "border-white/10 bg-white/[0.05] text-slate-300",
      chip: "border-white/10 bg-white/[0.05] text-slate-300",
      line: "bg-slate-400/35",
    };
  }

  return {
    icon: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    chip: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    line: "bg-cyan-400/40",
  };
}

function compactAction(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll(".", " · ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderLogRows(logs: AILog[], tone: LogTone) {
  const toneClass = toneClasses(tone);

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-400">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">No activity yet</h3>
          <p className="mt-1 text-xs text-slate-500">
            This stream has no records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={`absolute bottom-6 left-[31px] top-6 w-px ${toneClass.line}`} />

      <div className="space-y-3 p-4">
        {logs.map((log) => (
          <div
            key={log.id}
            className="relative grid gap-4 rounded-[22px] border border-white/10 bg-white/[0.035] p-4 transition hover:border-white/15 hover:bg-white/[0.055] lg:grid-cols-[minmax(0,1fr)_180px]"
          >
            <div className={`absolute left-[-1px] top-6 h-3 w-3 rounded-full border ${toneClass.chip}`} />

            <div className="min-w-0 pl-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] ${toneClass.chip}`}>
                  {log.entity_type || "system"}
                </span>
                <span className="text-xs text-slate-600">
                  {log.entity_id ? `ID: ${log.entity_id}` : "No entity ID"}
                </span>
              </div>

              <div className="mt-3 text-sm font-semibold text-white">
                {compactAction(log.action_type)}
              </div>

              <div className="mt-2 text-sm leading-6 text-slate-400">
                {formatDetails(log.details)}
              </div>
            </div>

            <div className="text-xs text-slate-500 lg:text-right">
              {formatDate(log.created_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AIActivityLogsPage() {
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
        id: "router",
        title: "Router Decisions",
        description: "Fallbacks, routing choices, and AI response-layer events.",
        icon: Activity,
        tone: "cyan",
        logs: routerLogs,
      },
      {
        id: "approved",
        title: "Approved Answers",
        description: "Trusted answers created, changed, replaced, or removed.",
        icon: FileCheck2,
        tone: "emerald",
        logs: approvedLogs,
      },
      {
        id: "cache",
        title: "Saved Replies",
        description: "Cache review, duplicate cleanup, promotions, and feedback work.",
        icon: Brain,
        tone: "violet",
        logs: cacheLogs,
      },
      {
        id: "knowledge",
        title: "Knowledge Bank",
        description: "Knowledge creation, updates, imports, archive, and delete actions.",
        icon: Database,
        tone: "amber",
        logs: knowledgeLogs,
      },
      {
        id: "guardrails",
        title: "Guardrails",
        description: "Blocked topics, scope rejections, refusals, and visible safety controls.",
        icon: Shield,
        tone: "rose",
        logs: guardrailLogs,
      },
      {
        id: "settings",
        title: "AI Settings",
        description: "Runtime setting changes and behavior-control updates.",
        icon: Gauge,
        tone: "slate",
        logs: coreSettingsLogs,
      },
      {
        id: "other",
        title: "Other Activity",
        description: "Unclassified or future AI management records.",
        icon: AlertCircle,
        tone: "slate",
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

  async function fetchActivityLogs(): Promise<
    | { ok: true; logs: AILog[] }
    | { ok: false; message: string }
  > {
    const { data, error } = await supabase
      .from("ai_admin_activity_logs")
      .select("id, action_type, entity_type, entity_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, logs: (data ?? []) as AILog[] };
  }

  const commandHeaderMetrics = useMemo<AixiaCommandMetricItem[]>(
    () => [
      { key: "total-0", title: "Total", value: String(metrics.total), tone: "neutral" },
      { key: "settings-1", title: "Settings", value: String(metrics.settingsChanges), tone: "cyan" },
      { key: "knowledge-2", title: "Knowledge", value: String(metrics.knowledgeChanges), tone: "emerald" },
      { key: "errors-3", title: "Errors", value: String(metrics.errors), tone: "rose" },
    ],
    [metrics, loading]
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await Promise.resolve();
      if (cancelled) return;

      setLoading(true);
      setErrorMessage(null);

      const result = await fetchActivityLogs();

      if (cancelled) return;

      if (!result.ok) {
        setErrorMessage(result.message);
        setLoading(false);
        return;
      }

      setLogs(result.logs);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadLogs() {
    setLoading(true);
    setErrorMessage(null);

    const result = await fetchActivityLogs();

    if (!result.ok) {
      setErrorMessage(result.message);
      setLoading(false);
      return;
    }

    setLogs(result.logs);
    setLoading(false);
  }

  return (
    <AixiaPage surface="command" className="aixia-command-page aixia-ai-management-page"><AixiaHero
        surface="command"
        className="shrink-0 space-y-4"
        parentLabel="AI Studio"
        parentPath="/ai-management"
        gradientTitle="Activity & Logs"
        title="Activity & Logs"
        subtitle="Review what changed across AI Studio: router decisions, trusted answers, saved replies, knowledge, guardrails, settings, and system actions."
      >
        <AixiaCommandMetrics items={commandHeaderMetrics} />
      </AixiaHero>

      <div className="aixia-command-scroll flex flex-col gap-6">

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {errorMessage}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
                Search & Refresh
              </div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                Activity Streams
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Latest 200 AI admin activity records, grouped by the area they affect.
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
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-3 p-5">
              {[1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="h-28 animate-pulse rounded-[26px] border border-white/10 bg-white/[0.03]"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 p-5">
              {sections.map((section) => (
                <ActivityStream key={section.id} section={section} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AixiaPage>
  );
}

function ActivityStream({ section }: { section: LogSection }) {
  const Icon = section.icon;
  const toneClass = toneClasses(section.tone);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className={`rounded-2xl border p-3 ${toneClass.icon}`}>
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

        <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass.chip}`}>
          {section.logs.length} logs
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto overscroll-contain">
        {renderLogRows(section.logs, section.tone)}
      </div>
    </div>
  );
}
