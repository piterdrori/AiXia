import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Database,
  Gauge,
  LockKeyhole,
  RefreshCcw,
  Save,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AixiaCommandMetrics, AixiaHero, AixiaPage } from "@/components/aixia";
import type { AixiaCommandMetricItem } from "@/components/aixia";
import "@/styles/dashboard/tokens.css";
import "@/styles/dashboard/layout.css";
import "@/styles/dashboard/visual.css";


type KnowledgeStrictness = "open" | "hybrid" | "strict";
type RefusalMode = "soft" | "standard" | "strict";

type GuardrailSettings = {
  guardrail_master_enabled: boolean;

  blocked_topics: string[];
  allowed_topics: string[];
  allowed_scope_enabled: boolean;
  force_refusal: boolean;

  weak_answer_guard_enabled: boolean;
  weak_answer_strictness: number;
  min_openai_length: number;

  knowledge_strictness: KnowledgeStrictness;
  refusal_mode: RefusalMode;

  cache_guard_enabled: boolean;
  auto_learning_guard_enabled: boolean;
  cache_safety_strictness: number;
};

type GuardrailKey = keyof GuardrailSettings;

type GuardrailLog = {
  id: string;
  action_type: string;
  details: Record<string, unknown>;
  created_at: string;
};

type SliderConfig = {
  key: GuardrailKey;
  title: string;
  lowLabel: string;
  highLabel: string;
  description: string;
};

const defaultGuardrails: GuardrailSettings = {
  guardrail_master_enabled: true,

  blocked_topics: [],
  allowed_topics: [],
  allowed_scope_enabled: false,
  force_refusal: false,

  weak_answer_guard_enabled: true,
  weak_answer_strictness: 55,
  min_openai_length: 80,

  knowledge_strictness: "hybrid",
  refusal_mode: "standard",

  cache_guard_enabled: true,
  auto_learning_guard_enabled: true,
  cache_safety_strictness: 70,
};

const guardrailKeys = Object.keys(defaultGuardrails) as GuardrailKey[];

const answerQualitySliders: SliderConfig[] = [
  {
    key: "weak_answer_strictness",
    title: "Weak Answer Guard",
    lowLabel: "Flexible",
    highLabel: "Strict",
    description:
      "Controls how aggressively the router rejects short, vague, or low-confidence OpenAI answers.",
  },
  {
    key: "min_openai_length",
    title: "Minimum OpenAI Answer Length",
    lowLabel: "Short",
    highLabel: "Long",
    description:
      "Visible minimum answer-length guard. This replaces hidden hardcoded answer length behavior.",
  },
];

const cacheSliders: SliderConfig[] = [
  {
    key: "cache_safety_strictness",
    title: "Cache Safety Strictness",
    lowLabel: "Flexible",
    highLabel: "Strict",
    description:
      "Controls how strict the router should be before saving or trusting reusable cache answers.",
  },
];

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
    .slice(0, 5)
    .map((key) => `${key}: ${String(details[key])}`)
    .join(" · ");
}

function getNumberValue(value: string | number | boolean) {
  if (typeof value === "boolean") return value ? 100 : 0;
  return typeof value === "number" ? value : Number(value);
}

function getSliderValue(settings: GuardrailSettings, key: GuardrailKey) {
  const value = settings[key];
  return typeof value === "number" ? value : 0;
}

function normalizeGuardrailValue(
  key: GuardrailKey,
  value: unknown
): string[] | boolean | number | string {
  const fallback = defaultGuardrails[key];

  if (Array.isArray(fallback)) {
    return Array.isArray(value) ? value.map(String) : fallback;
  }

  if (typeof fallback === "boolean") {
    return Boolean(value);
  }

  if (typeof fallback === "number") {
    return Number(value ?? fallback);
  }

  return String(value ?? fallback);
}

export default function AIGuardrailsPage() {

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
    if (!guardrails.guardrail_master_enabled) return "Disabled";
    if (guardrails.force_refusal) return "Full Refusal";
    if (guardrails.allowed_scope_enabled && guardrails.allowed_topics.length > 0) {
      return "Allowed Scope";
    }
    if (guardrails.blocked_topics.length > 0) return "Blocked Topics";
    return "Open";
  }, [guardrails]);

  const visibleGuardCount = useMemo(() => {
    let count = 0;

    if (guardrails.guardrail_master_enabled) count += 1;
    if (guardrails.blocked_topics.length > 0) count += 1;
    if (guardrails.allowed_scope_enabled) count += 1;
    if (guardrails.force_refusal) count += 1;
    if (guardrails.weak_answer_guard_enabled) count += 1;
    if (guardrails.cache_guard_enabled) count += 1;
    if (guardrails.auto_learning_guard_enabled) count += 1;

    return count;
  }, [guardrails]);

  const blockedCount = guardrails.blocked_topics.length;
  const allowedCount = guardrails.allowed_topics.length;

  const commandHeaderMetrics = useMemo<AixiaCommandMetricItem[]>(
    () => [
      { key: "mode-0", title: "Mode", value: guardrailMode, tone: "neutral" },
      { key: "active-guards-1", title: "Active Guards", value: String(visibleGuardCount), tone: "rose" },
      { key: "blocked-2", title: "Blocked", value: String(blockedCount), tone: "amber" },
      { key: "allowed-3", title: "Allowed", value: String(allowedCount), tone: "emerald" },
    ],
    [guardrailMode, visibleGuardCount, blockedCount, allowedCount]
  );

  useEffect(() => {
    void loadGuardrails();
  }, []);

  async function seedMissingSettings(existingKeys: Set<string>) {
    const missingRows = guardrailKeys
      .filter((key) => !existingKeys.has(key))
      .map((key) => ({
        setting_key: key,
        setting_value: {
          value: defaultGuardrails[key],
        },
      }));

    if (missingRows.length === 0) return;

    const { error } = await supabase.from("ai_settings").insert(missingRows);

    if (error) {
      throw new Error(error.message);
    }
  }

  async function loadGuardrails() {
    setLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const { data, error } = await supabase
        .from("ai_settings")
        .select("setting_key, setting_value")
        .in("setting_key", guardrailKeys as string[]);

      if (error) {
        throw new Error(error.message);
      }

      const existingKeys = new Set(
        (data ?? []).map((row) => String(row.setting_key))
      );

      await seedMissingSettings(existingKeys);

      const { data: refreshedData, error: refreshedError } = await supabase
        .from("ai_settings")
        .select("setting_key, setting_value")
        .in("setting_key", guardrailKeys as string[]);

      if (refreshedError) {
        throw new Error(refreshedError.message);
      }

      const nextGuardrails = { ...defaultGuardrails };

      for (const row of refreshedData ?? []) {
        const key = row.setting_key as GuardrailKey;

        if (key in nextGuardrails) {
          (nextGuardrails as Record<string, unknown>)[key] =
            normalizeGuardrailValue(key, row.setting_value?.value);
        }
      }

      guardrailsRef.current = nextGuardrails;
      setGuardrails(nextGuardrails);
      setBlockedText(nextGuardrails.blocked_topics.join(", "));
      setAllowedText(nextGuardrails.allowed_topics.join(", "));

      await loadGuardrailLogs();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load guardrails."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadGuardrailLogs() {
    const { data } = await supabase
      .from("ai_admin_activity_logs")
      .select("id, action_type, details, created_at")
      .or(
        [
          "action_type.eq.router_guardrail_blocked",
          "action_type.eq.router_guardrail_scope_rejected",
          "action_type.eq.router_force_refusal",
          "action_type.eq.router_controlled_refusal",
          "action_type.eq.guardrail_setting_updated",
        ].join(",")
      )
      .order("created_at", { ascending: false })
      .limit(80);

    setLogs((data ?? []) as GuardrailLog[]);
  }

  function updateLocalGuardrail(
    key: GuardrailKey,
    value: string[] | boolean | number | string
  ) {
    const nextGuardrails = {
      ...guardrailsRef.current,
      [key]: value,
    } as GuardrailSettings;

    guardrailsRef.current = nextGuardrails;
    setGuardrails(nextGuardrails);
  }

  async function saveAllGuardrails() {
    setSaving(true);
    setErrorMessage(null);
    setActionMessage(null);

    const nextGuardrails: GuardrailSettings = {
      ...guardrailsRef.current,
      blocked_topics: parseTopicInput(blockedText),
      allowed_topics: parseTopicInput(allowedText),
    };

    guardrailsRef.current = nextGuardrails;
    setGuardrails(nextGuardrails);

    for (const key of guardrailKeys) {
      const value = nextGuardrails[key];

      const { error } = await supabase.rpc("ai_update_setting", {
        p_setting_key: key,
        p_setting_value: { value },
      });

      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "guardrail_setting_updated",
      entity_type: "guardrail",
      entity_id: null,
      details: {
        settings_saved: guardrailKeys.length,
        guardrail_master_enabled: nextGuardrails.guardrail_master_enabled,
        force_refusal: nextGuardrails.force_refusal,
        weak_answer_guard_enabled: nextGuardrails.weak_answer_guard_enabled,
        weak_answer_strictness: nextGuardrails.weak_answer_strictness,
        knowledge_strictness: nextGuardrails.knowledge_strictness,
        cache_guard_enabled: nextGuardrails.cache_guard_enabled,
      },
    });

    setActionMessage("Guardrail controls saved.");
    setSaving(false);
    await loadGuardrailLogs();
  }

  return (
    <AixiaPage surface="command" className="aixia-command-page aixia-ai-management-page"><AixiaHero
        surface="command"
        className="shrink-0 space-y-4"
        parentLabel="AI Studio"
        parentPath="/ai-management"
        gradientTitle="Guardrails"
        title="Guardrails"
        subtitle="Central control for all visible AI business guardrails. The router should execute these settings from the database, not hidden hardcoded product guards."
      >
        <AixiaCommandMetrics items={commandHeaderMetrics} />
      </AixiaHero>

      <div className="aixia-command-scroll flex flex-col gap-6">

        {(errorMessage || actionMessage) && (
          <div className="space-y-2">
            {errorMessage ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {errorMessage}
              </div>
            ) : null}

            {actionMessage ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {actionMessage}
              </div>
            ) : null}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <PurposeCard
            icon={Shield}
            title="Single Source of Truth"
            description="All product guardrails should be controlled here and stored in ai_settings."
          />

          <PurposeCard
            icon={Gauge}
            title="0–100 Strength"
            description="Strictness sliders make router behavior visible and tunable from the frontend."
          />

          <PurposeCard
            icon={LockKeyhole}
            title="Backend Executor"
            description="The backend should execute saved settings, not hide business logic decisions."
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Master Guardrail Controls
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Global switches that define how router guardrails are applied.
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

              <div className="grid gap-4 p-5">
                <ToggleControl
                  icon={Shield}
                  title="Master Guardrails"
                  description="When OFF, product guardrails are disabled except platform safety and approved-answer logic."
                  enabled={guardrails.guardrail_master_enabled}
                  onToggle={() =>
                    updateLocalGuardrail(
                      "guardrail_master_enabled",
                      !guardrails.guardrail_master_enabled
                    )
                  }
                  tone="rose"
                />

                <ToggleControl
                  icon={ShieldAlert}
                  title="Force Refusal"
                  description="When ON, router refuses every request unless an approved answer catches it first."
                  enabled={guardrails.force_refusal}
                  onToggle={() =>
                    updateLocalGuardrail("force_refusal", !guardrails.force_refusal)
                  }
                  tone="rose"
                />

                <ToggleControl
                  icon={CheckCircle2}
                  title="Allowed Scope Filter"
                  description="When ON, only prompts matching Allowed Topics are accepted. When OFF, Allowed Topics are informational only."
                  enabled={guardrails.allowed_scope_enabled}
                  onToggle={() =>
                    updateLocalGuardrail(
                      "allowed_scope_enabled",
                      !guardrails.allowed_scope_enabled
                    )
                  }
                  tone="emerald"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Topic Controls
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Use comma-separated values. These are visible business guardrails.
                </p>
              </div>

              <div className="grid gap-5 p-5">
                <TopicEditor
                  icon={Ban}
                  title="Blocked Topics"
                  description="Prompts containing these words are rejected only when Master Guardrails are ON."
                  value={blockedText}
                  topics={parseTopicInput(blockedText)}
                  onChange={setBlockedText}
                  onRemove={(topic) => {
                    const nextTopics = parseTopicInput(blockedText).filter(
                      (item) => item !== topic
                    );
                    setBlockedText(nextTopics.join(", "));
                  }}
                  tone="blocked"
                />

                <TopicEditor
                  icon={CheckCircle2}
                  title="Allowed Topics"
                  description="Used only when Allowed Scope Filter is ON."
                  value={allowedText}
                  topics={parseTopicInput(allowedText)}
                  onChange={setAllowedText}
                  onRemove={(topic) => {
                    const nextTopics = parseTopicInput(allowedText).filter(
                      (item) => item !== topic
                    );
                    setAllowedText(nextTopics.join(", "));
                  }}
                  tone="allowed"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Answer Quality Guards
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Control weak answer blocking from the frontend.
                </p>
              </div>

              <div className="grid gap-4 p-5">
                <ToggleControl
                  icon={SlidersHorizontal}
                  title="Weak Answer Guard"
                  description="When ON, router can reject short, vague, or low-quality generated answers based on the strictness below."
                  enabled={guardrails.weak_answer_guard_enabled}
                  onToggle={() =>
                    updateLocalGuardrail(
                      "weak_answer_guard_enabled",
                      !guardrails.weak_answer_guard_enabled
                    )
                  }
                  tone="amber"
                />

                <SliderPanel
                  sliders={answerQualitySliders}
                  settings={guardrails}
                  onChange={updateLocalGuardrail}
                />

                <SelectPanel
                  label="Knowledge Strictness"
                  value={guardrails.knowledge_strictness}
                  options={[
                    {
                      value: "open",
                      label: "Open",
                      description: "More flexible fallback behavior.",
                    },
                    {
                      value: "hybrid",
                      label: "Hybrid",
                      description: "Prefer knowledge but allow supported fallback.",
                    },
                    {
                      value: "strict",
                      label: "Strict",
                      description: "Do not answer unless knowledge is explicit.",
                    },
                  ]}
                  onChange={(value) =>
                    updateLocalGuardrail(
                      "knowledge_strictness",
                      value as KnowledgeStrictness
                    )
                  }
                />

                <SelectPanel
                  label="Refusal Mode"
                  value={guardrails.refusal_mode}
                  options={[
                    {
                      value: "soft",
                      label: "Soft",
                      description: "More helpful refusal language.",
                    },
                    {
                      value: "standard",
                      label: "Standard",
                      description: "Balanced refusal behavior.",
                    },
                    {
                      value: "strict",
                      label: "Strict",
                      description: "Short and direct refusal language.",
                    },
                  ]}
                  onChange={(value) =>
                    updateLocalGuardrail("refusal_mode", value as RefusalMode)
                  }
                />
              </div>
            </div>

                        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Cache & Auto-Learning Guards
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Control reusable answer safety from the frontend.
                </p>
              </div>

              <div className="grid gap-4 p-5">
                <ToggleControl
                  icon={Database}
                  title="Cache Guard"
                  description="When ON, cache behavior should follow visible strictness controls instead of hidden router decisions."
                  enabled={guardrails.cache_guard_enabled}
                  onToggle={() =>
                    updateLocalGuardrail(
                      "cache_guard_enabled",
                      !guardrails.cache_guard_enabled
                    )
                  }
                  tone="cyan"
                />

                <ToggleControl
                  icon={Database}
                  title="Auto-Learning Guard"
                  description="When ON, auto-learning should only save reusable answers that pass visible quality controls."
                  enabled={guardrails.auto_learning_guard_enabled}
                  onToggle={() =>
                    updateLocalGuardrail(
                      "auto_learning_guard_enabled",
                      !guardrails.auto_learning_guard_enabled
                    )
                  }
                  tone="cyan"
                />

                <SliderPanel
                  sliders={cacheSliders}
                  settings={guardrails}
                  onChange={updateLocalGuardrail}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void saveAllGuardrails()}
              disabled={saving || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save All Guardrails"}
            </button>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Shield className="h-4 w-4" />
                Guardrail Execution Rules
              </div>

              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  This page should be the single source of truth for AiXia product guardrails.
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  The router should read these settings from ai_settings and execute them directly.
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  Platform-level legal/safety restrictions still cannot be bypassed.
                </div>
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
          </aside>
        </section>
      </div>
    </AixiaPage>
  );
}

function PurposeCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-rose-200">
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

function ToggleControl({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  tone,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  tone: "rose" | "emerald" | "amber" | "cyan";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
      : tone === "amber"
        ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
        : tone === "cyan"
          ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
          : "border-rose-400/20 bg-rose-500/10 text-rose-200";

  return (
    <div className="flex flex-col gap-4 rounded-[26px] border border-white/10 bg-black/20 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3">
        <div className={`rounded-2xl border p-3 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-1 text-sm leading-6 text-slate-400">
            {description}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex min-w-[160px] items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
          enabled
            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
            : "border-rose-400/30 bg-rose-500/10 text-rose-200"
        }`}
      >
        {enabled ? "ON" : "OFF"}
        {enabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
      </button>
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

function SliderPanel({
  sliders,
  settings,
  onChange,
}: {
  sliders: SliderConfig[];
  settings: GuardrailSettings;
  onChange: (key: GuardrailKey, value: string[] | boolean | number | string) => void;
}) {
  return (
    <div className="grid gap-4">
      {sliders.map((slider) => {
        const value = getSliderValue(settings, slider.key);
        const max = slider.key === "min_openai_length" ? 300 : 100;

        return (
          <div
            key={slider.key}
            className="rounded-[26px] border border-white/10 bg-black/20 p-5"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {slider.title}
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-400">
                  {slider.description}
                </div>
              </div>

              <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-200">
                {value}
              </div>
            </div>

            <div className="mt-4">
              <input
                type="range"
                min={0}
                max={max}
                value={value}
                onChange={(event) =>
                  onChange(slider.key, getNumberValue(event.target.value))
                }
                className="w-full accent-amber-400"
              />

              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{slider.lowLabel}</span>
                <span>{slider.highLabel}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SelectPanel({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{
    value: string;
    label: string;
    description: string;
  }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
      <div className="text-sm font-semibold text-white">{label}</div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                active
                  ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-100"
                  : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
              }`}
            >
              <div className="text-sm font-semibold">{option.label}</div>
              <div className="mt-2 text-xs leading-5 text-slate-500">
                {option.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
