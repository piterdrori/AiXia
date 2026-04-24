import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ApprovedAnswerRow = {
  id: string;
  question: string;
  normalized_question: string;
  answer: string;
  category: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  source_cache_id: string | null;
  usage_count: number | null;
  confidence_score: number | string | null;
  last_used_at: string | null;
  demoted_at: string | null;
  approved_version: number | null;
  replaced_by_id: string | null;
};

type ApprovedAnswerForm = {
  question: string;
  answer: string;
  category: string;
  priority: string;
  confidence_score: string;
  is_active: boolean;
};

const emptyForm: ApprovedAnswerForm = {
  question: "",
  answer: "",
  category: "",
  priority: "100",
  confidence_score: "1",
  is_active: true,
};

function normalizeQuestion(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ").replace(/[?.!]+$/g, "");
}

function formatDate(value: string | null) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function confidencePercent(value: ApprovedAnswerRow["confidence_score"]) {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) return "0%";

  return `${Math.round(numericValue * 100)}%`;
}

function getCategoryLabel(value: string | null) {
  return value?.trim() ? value : "Uncategorized";
}

export default function AIApprovedAnswersPage() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<ApprovedAnswerRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ApprovedAnswerForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedAnswer = useMemo(
    () => answers.find((answer) => answer.id === selectedId) ?? null,
    [answers, selectedId]
  );

  const categories = useMemo(() => {
    const uniqueCategories = new Set(
      answers
        .map((answer) => answer.category?.trim())
        .filter((category): category is string => Boolean(category))
    );

    return Array.from(uniqueCategories).sort((first, second) =>
      first.localeCompare(second)
    );
  }, [answers]);

  const filteredAnswers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return answers.filter((answer) => {
      const matchesSearch =
        !normalizedSearch ||
        answer.question.toLowerCase().includes(normalizedSearch) ||
        answer.answer.toLowerCase().includes(normalizedSearch) ||
        answer.normalized_question.toLowerCase().includes(normalizedSearch) ||
        (answer.category ?? "").toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && answer.is_active) ||
        (statusFilter === "inactive" && !answer.is_active);

      const matchesCategory =
        categoryFilter === "all" || answer.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [answers, categoryFilter, search, statusFilter]);

  const activeCount = useMemo(
    () => answers.filter((answer) => answer.is_active).length,
    [answers]
  );

  const inactiveCount = answers.length - activeCount;

  const topPriorityCount = useMemo(
    () => answers.filter((answer) => answer.priority <= 10).length,
    [answers]
  );

  const totalUsage = useMemo(
    () =>
      answers.reduce((total, answer) => total + Number(answer.usage_count ?? 0), 0),
    [answers]
  );

  useEffect(() => {
    void loadApprovedAnswers();
  }, []);

  useEffect(() => {
    if (!selectedAnswer || isCreating) return;

    setForm({
      question: selectedAnswer.question,
      answer: selectedAnswer.answer,
      category: selectedAnswer.category ?? "",
      priority: String(selectedAnswer.priority),
      confidence_score: String(selectedAnswer.confidence_score ?? 1),
      is_active: selectedAnswer.is_active,
    });
  }, [isCreating, selectedAnswer]);

  async function loadApprovedAnswers() {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("ai_approved_answers")
      .select(
        "id, question, normalized_question, answer, category, is_active, priority, created_at, updated_at, source_cache_id, usage_count, confidence_score, last_used_at, demoted_at, approved_version, replaced_by_id"
      )
      .order("priority", { ascending: true })
      .order("updated_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as ApprovedAnswerRow[];
    setAnswers(rows);

    if (!selectedId && rows.length > 0) {
      setSelectedId(rows[0].id);
    }

    setLoading(false);
  }

  function startCreate() {
    setIsCreating(true);
    setSelectedId(null);
    setForm(emptyForm);
    setActionMessage(null);
    setErrorMessage(null);
  }

  function selectAnswer(answer: ApprovedAnswerRow) {
    setIsCreating(false);
    setSelectedId(answer.id);
    setActionMessage(null);
    setErrorMessage(null);
  }

  async function saveAnswer() {
    const trimmedQuestion = form.question.trim();
    const trimmedAnswer = form.answer.trim();
    const priority = Number(form.priority);
    const confidenceScore = Number(form.confidence_score);

    if (!trimmedQuestion || !trimmedAnswer) {
      setErrorMessage("Question and answer are required.");
      return;
    }

    if (!Number.isInteger(priority) || priority < 1) {
      setErrorMessage("Priority must be a positive whole number.");
      return;
    }

      if (!Number.isFinite(confidenceScore) || confidenceScore < 0 || confidenceScore > 1) {
      setErrorMessage("Confidence score must be between 0 and 1.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setActionMessage(null);

    const payload = {
      question: trimmedQuestion,
      normalized_question: normalizeQuestion(trimmedQuestion),
      answer: trimmedAnswer,
      category: form.category.trim() || null,
      priority,
      confidence_score: confidenceScore,
      is_active: form.is_active,
    };

    if (isCreating) {
      const { data, error } = await supabase
        .from("ai_approved_answers")
        .insert(payload)
        .select(
          "id, question, normalized_question, answer, category, is_active, priority, created_at, updated_at, source_cache_id, usage_count, confidence_score, last_used_at, demoted_at, approved_version, replaced_by_id"
        )
        .single();

      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }

      setAnswers((current) =>
        [...current, data as ApprovedAnswerRow].sort(
          (first, second) => first.priority - second.priority
        )
      );
      setSelectedId((data as ApprovedAnswerRow).id);
      setIsCreating(false);
      setActionMessage("Approved answer created.");
      setSaving(false);
      return;
    }

    if (!selectedAnswer) {
      setErrorMessage("No approved answer selected.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("ai_approved_answers")
      .update(payload)
      .eq("id", selectedAnswer.id)
      .select(
        "id, question, normalized_question, answer, category, is_active, priority, created_at, updated_at, source_cache_id, usage_count, confidence_score, last_used_at, demoted_at, approved_version, replaced_by_id"
      )
      .single();

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setAnswers((current) =>
      current
        .map((answer) =>
          answer.id === selectedAnswer.id ? (data as ApprovedAnswerRow) : answer
        )
        .sort((first, second) => first.priority - second.priority)
    );
    setSelectedId((data as ApprovedAnswerRow).id);
    setActionMessage("Approved answer updated.");
    setSaving(false);
  }

  async function toggleActive(answer: ApprovedAnswerRow) {
    setSaving(true);
    setErrorMessage(null);
    setActionMessage(null);

    const { data, error } = await supabase
      .from("ai_approved_answers")
      .update({ is_active: !answer.is_active })
      .eq("id", answer.id)
      .select(
        "id, question, normalized_question, answer, category, is_active, priority, created_at, updated_at, source_cache_id, usage_count, confidence_score, last_used_at, demoted_at, approved_version, replaced_by_id"
      )
      .single();

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setAnswers((current) =>
      current.map((currentAnswer) =>
        currentAnswer.id === answer.id ? (data as ApprovedAnswerRow) : currentAnswer
      )
    );
    setSelectedId((data as ApprovedAnswerRow).id);
    setActionMessage(
      (data as ApprovedAnswerRow).is_active
        ? "Approved answer activated."
        : "Approved answer deactivated."
    );
    setSaving(false);
  }

  const pageTitle = isCreating
    ? "Create Approved Answer"
    : selectedAnswer
      ? "Approved Answer Inspector"
      : "Approved Answer Inspector";

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
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Router Priority Layer
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                    Approved Answers
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Manage trusted answers that override cache, semantic matches, and model fallback.
                    These answers are the highest-priority response layer in AiXia Assistant.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[460px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Active
                </p>
                <p className="mt-2 text-3xl font-semibold text-emerald-200">
                  {activeCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Inactive
                </p>
                <p className="mt-2 text-3xl font-semibold text-amber-200">
                  {inactiveCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  High Priority
                </p>
                <p className="mt-2 text-3xl font-semibold text-cyan-200">
                  {topPriorityCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Total Usage
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {totalUsage}
                </p>
              </div>
            </div>
          </div>
        </header>

                <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* LEFT — LIST */}
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Approved Answers
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Highest-priority answers used by the AI router.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void loadApprovedAnswers()}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Refresh
                    </button>

                    <button
                      type="button"
                      onClick={startCreate}
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-500/20"
                    >
                      <Plus className="h-4 w-4" />
                      New
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search questions, answers, category..."
                      className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-9 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as "all" | "active" | "inactive")
                    }
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-300 focus:border-cyan-400/40 focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-300 focus:border-cyan-400/40 focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="max-h-[620px] overflow-y-auto">
                {loading ? (
                  <div className="px-5 py-6 text-sm text-slate-400">Loading approved answers...</div>
                ) : filteredAnswers.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-slate-500">
                    No approved answers found.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {filteredAnswers.map((answer) => {
                      const isSelected = answer.id === selectedId && !isCreating;

                      return (
                        <button
                          key={answer.id}
                          type="button"
                          onClick={() => selectAnswer(answer)}
                          className={`w-full px-5 py-4 text-left transition ${
                            isSelected
                              ? "bg-cyan-500/10"
                              : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-white">
                                {answer.question}
                              </p>
                              <p className="text-xs text-slate-500">
                                {getCategoryLabel(answer.category)} • Priority {answer.priority}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {answer.is_active ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <XCircle className="h-4 w-4 text-amber-400" />
                              )}
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Usage: {answer.usage_count ?? 0}</span>
                            <span>{confidencePercent(answer.confidence_score)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — INSPECTOR */}
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {pageTitle}
                </h2>
              </div>

              <div className="flex flex-col gap-4 px-5 py-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Question
                  </label>
                  <input
                    value={form.question}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, question: event.target.value }))
                    }
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Answer
                  </label>
                  <textarea
                    rows={6}
                    value={form.answer}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, answer: event.target.value }))
                    }
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Category
                    </label>
                    <input
                      value={form.category}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, category: event.target.value }))
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Priority
                    </label>
                    <input
                      type="number"
                      value={form.priority}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, priority: event.target.value }))
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                    />
                  </div>
                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Confidence Score
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={form.confidence_score}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          confidence_score: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                    />
                  </div>

                  <label className="flex items-end gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          is_active: event.target.checked,
                        }))
                      }
                      className="mb-1 h-4 w-4 rounded border-white/20 bg-white/10"
                    />
                    Active approved answer
                  </label>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <SlidersHorizontal className="h-4 w-4" />
                    Runtime Details
                  </div>

                  <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
                    <div>
                      <p className="text-slate-500">Normalized Question</p>
                      <p className="mt-1 break-words text-slate-200">
                        {normalizeQuestion(form.question) || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Last Used</p>
                      <p className="mt-1 text-slate-200">
                        {formatDate(selectedAnswer?.last_used_at ?? null)}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Usage Count</p>
                      <p className="mt-1 text-slate-200">
                        {selectedAnswer?.usage_count ?? 0}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Version</p>
                      <p className="mt-1 text-slate-200">
                        {selectedAnswer?.approved_version ?? 1}
                      </p>
                    </div>
                  </div>
                </div>

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

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void saveAnswer()}
                    disabled={saving}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : isCreating ? "Create Answer" : "Save Changes"}
                  </button>

                  {selectedAnswer ? (
                    <button
                      type="button"
                      onClick={() => void toggleActive(selectedAnswer)}
                      disabled={saving}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {selectedAnswer.is_active ? (
                        <>
                          <XCircle className="h-4 w-4 text-amber-300" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                          Activate
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <FileCheck2 className="h-4 w-4" />
                Safety Rule
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Active approved answers are checked before exact cache, semantic cache, and
                OpenAI fallback. Keep answers short, accurate, and platform-specific.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
