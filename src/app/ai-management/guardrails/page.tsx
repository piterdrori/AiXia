import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  RefreshCcw,
  Save,
  Shield,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type GuardrailSettings = {
  blocked_topics: string[];
  allowed_topics: string[];
  force_refusal: boolean;
};

type GuardrailLog = {
  id: string;
  action_type: string;
  details: Record<string, unknown>;
  created_at: string;
};

const defaultGuardrails: GuardrailSettings = {
  blocked_topics: [],
  allowed_topics: [],
  force_refusal: false,
};

function parseTopicInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
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

export default function AIGuardrailsPage() {
  const navigate = useNavigate();

  const guardrailsRef = useRef<GuardrailSettings>(defaultGuardrails);

  const [guardrails, setGuardrails] =
    useState<GuardrailSettings>(defaultGuardrails);
  const [blockedText, setBlockedText] = useState("");
  const [allowedText, setAllowedText] = useState("");
  const [logs, setLogs] = useState<GuardrailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const guardrailMode = useMemo(() => {
    if (guardrails.force_refusal) return "Full Refusal";
    if (guardrails.allowed_topics.length > 0) return "Allowed Scope";
    if (guardrails.blocked_topics.length > 0) return "Blocked Topics";
    return "Open";
  }, [guardrails]);

  const blockedCount = guardrails.blocked_topics.length;
  const allowedCount = guardrails.allowed_topics.length;

  useEffect(() => {
    void loadGuardrails();
  }, []);

  async function loadGuardrails() {
    setLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    const { data, error } = await supabase
      .from("ai_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["blocked_topics", "allowed_topics", "force_refusal"]);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const nextGuardrails = { ...defaultGuardrails };

    for (const row of data ?? []) {
      const key = row.setting_key as keyof GuardrailSettings;

      if (key in nextGuardrails) {
        (nextGuardrails as Record<string, unknown>)[key] =
          row.setting_value?.value ?? nextGuardrails[key];
      }
    }

    guardrailsRef.current = nextGuardrails;
    setGuardrails(nextGuardrails);
    setBlockedText(nextGuardrails.blocked_topics.join(", "));
    setAllowedText(nextGuardrails.allowed_topics.join(", "));

    await loadGuardrailLogs();

    setLoading(false);
  }

  async function loadGuardrailLogs() {
    const { data } = await supabase
      .from("ai_admin_activity_logs")
      .select("id, action_type, details, created_at")
      .eq("entity_type", "router")
      .in("action_type", [
        "router_guardrail_blocked",
        "router_guardrail_scope_rejected",
        "router_force_refusal",
      ])
      .order("created_at", { ascending: false })
      .limit(50);

    setLogs((data ?? []) as GuardrailLog[]);
  }

  async function saveSetting(
    key: keyof GuardrailSettings,
    value: string[] | boolean
  ) {
    const nextGuardrails = {
      ...guardrailsRef.current,
      [key]: value,
    };

    guardrailsRef.current = nextGuardrails;
    setGuardrails(nextGuardrails);

    const { error } = await supabase.rpc("ai_update_setting", {
      p_setting_key: key,
      p_setting_value: { value },
    });

    if (error) {
      setErrorMessage(error.message);
      return false;
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "guardrail_setting_updated",
      entity_type: "guardrail",
      entity_id: null,
      details: {
        setting: key,
        value,
      },
    });

    return true;
  }

  async function saveTopicLists() {
    setSaving(true);
    setErrorMessage(null);
    setActionMessage(null);

    const blockedTopics = parseTopicInput(blockedText);
    const allowedTopics = parseTopicInput(allowedText);

    const blockedSaved = await saveSetting("blocked_topics", blockedTopics);
    if (!blockedSaved) {
      setSaving(false);
      return;
    }

    const allowedSaved = await saveSetting("allowed_topics", allowedTopics);
    if (!allowedSaved) {
      setSaving(false);
      return;
    }

    setActionMessage("Guardrail topics saved.");
    setSaving(false);
  }

  async function toggleForceRefusal() {
    setErrorMessage(null);
    setActionMessage(null);

    const nextValue = !guardrailsRef.current.force_refusal;
    const saved = await saveSetting("force_refusal", nextValue);

    if (!saved) return;

    setActionMessage(
      nextValue ? "Force refusal enabled." : "Force refusal disabled."
    );
  }

  function removeBlockedTopic(topic: string) {
    const nextTopics = guardrails.blocked_topics.filter(
      (item) => item !== topic
    );

    setBlockedText(nextTopics.join(", "));
  }

  function removeAllowedTopic(topic: string) {
    const nextTopics = guardrails.allowed_topics.filter(
      (item) => item !== topic
    );

    setAllowedText(nextTopics.join(", "));
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
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-200">
                  <Shield className="h-3.5 w-3.5" />
                  Safety Control Layer
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                    Guardrails
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Manage blocked topics, allowed scope, force refusal, and recent guardrail decisions used by the AI router.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[620px]">
              <MetricCard label="Mode" value={guardrailMode} />
              <MetricCard label="Blocked" value={String(blockedCount)} />
              <MetricCard label="Allowed" value={String(allowedCount)} />
            </div>
          </div>
        </header>

        {(errorMessage || actionMessage) && (
          <div className="space-y-2">
            {errorMessage && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {errorMessage}
              </div>
            )}

            {actionMessage && (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {actionMessage}
              </div>
            )}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Topic Controls
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Use comma-separated values. Changes are stored in ai_settings.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadGuardrails()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            <div className="grid gap-5 p-5">
              <TopicEditor
                icon={Ban}
                title="Blocked Topics"
                description="Any prompt containing these words is immediately rejected."
                value={blockedText}
                topics={parseTopicInput(blockedText)}
                onChange={setBlockedText}
                onRemove={removeBlockedTopic}
                tone="blocked"
              />

              <TopicEditor
                icon={CheckCircle2}
                title="Allowed Topics"
                description="When this list is not empty, only prompts matching these topics are allowed."
                value={allowedText}
                topics={parseTopicInput(allowedText)}
                onChange={setAllowedText}
                onRemove={removeAllowedTopic}
                tone="allowed"
              />

              <div className="flex flex-col gap-4 rounded-[26px] border border-white/10 bg-black/20 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-rose-200">
                    <ShieldAlert className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-white">
                      Force Refusal
                    </div>
                    <div className="mt-1 text-sm leading-6 text-slate-400">
                      When enabled, the router refuses every request unless an approved answer catches it first.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void toggleForceRefusal()}
                  className={`inline-flex min-w-[180px] items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    guardrails.force_refusal
                      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                      : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  }`}
                >
                  {guardrails.force_refusal ? "ON" : "OFF"}
                  {guardrails.force_refusal ? (
                    <ToggleRight className="h-5 w-5" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => void saveTopicLists()}
                disabled={saving || loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Guardrails"}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Recent Guardrail Logs
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Latest guardrail decisions from the AI router.
              </p>
            </div>

            <div className="max-h-[720px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">
                  No guardrail logs yet.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {logs.map((log) => (
                    <div key={log.id} className="px-5 py-4">
                      <div className="text-sm font-semibold text-white">
                        {log.action_type}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">
                        {formatDetails(log.details)}
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        {formatDate(log.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function TopicEditor({
  icon: Icon,
  title,
  description,
  value,
  topics,
  onChange,
  onRemove,
  tone,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
  value: string;
  topics: string[];
  onChange: (value: string) => void;
  onRemove: (topic: string) => void;
  tone: "blocked" | "allowed";
}) {
  const toneClass =
    tone === "blocked"
      ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
      : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";

  return (
    <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
      <div className="flex items-start gap-3">
        <div className={`rounded-2xl border p-3 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-1 text-sm leading-6 text-slate-400">
            {description}
          </div>

          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="finance, hack, movies"
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {topics.length === 0 ? (
              <span className="text-xs text-slate-600">No topics defined.</span>
            ) : (
              topics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => onRemove(topic)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${toneClass}`}
                >
                  {topic}
                  <X className="h-3 w-3" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
