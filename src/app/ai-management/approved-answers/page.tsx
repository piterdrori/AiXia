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
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?.!]+$/g, "");
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

function statusChipClass(isActive: boolean) {
  if (isActive) {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
  }

  return "border-amber-400/20 bg-amber-500/10 text-amber-300";
}

function priorityChipClass(priority: number) {
  if (priority <= 10) {
    return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
  }

  if (priority <= 100) {
    return "border-violet-400/20 bg-violet-500/10 text-violet-200";
  }

  return "border-white/10 bg-white/[0.05] text-slate-400";
}

export default function AIApprovedAnswersPage() {
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<ApprovedAnswerRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ApprovedAnswerForm>(emptyForm);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
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

  const duplicates = useMemo(() => {
    if (!selectedAnswer) return [];

    return answers.filter(
      (item) =>
        item.id !== selectedAnswer.id &&
        item.normalized_question === selectedAnswer.normalized_question
    );
  }, [answers, selectedAnswer]);

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
      answers.reduce(
        (total, answer) => total + Number(answer.usage_count ?? 0),
        0
      ),
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

    if (selectedId && rows.every((answer) => answer.id !== selectedId)) {
      setSelectedId(rows[0]?.id ?? null);
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

    if (
      !Number.isFinite(confidenceScore) ||
      confidenceScore < 0 ||
      confidenceScore > 1
    ) {
      setErrorMessage("Confidence score must be between 0 and 1.");
      return;
    }

    const normalized = normalizeQuestion(trimmedQuestion);

    const duplicateExists = answers.some(
      (item) =>
        item.normalized_question === normalized &&
        item.id !== selectedAnswer?.id &&
        item.is_active
    );

    if (duplicateExists) {
      setErrorMessage(
        "An active approved answer with the same question already exists. Deactivate or replace it first."
      );
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setActionMessage(null);

    const payload = {
      question: trimmedQuestion,
      normalized_question: normalized,
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

      await supabase.from("ai_admin_activity_logs").insert({
        action_type: "approved_created",
        entity_type: "approved_answer",
        entity_id: (data as ApprovedAnswerRow).id,
        details: {
          question: trimmedQuestion,
          normalized_question: normalized,
          category: form.category.trim() || null,
          priority,
          confidence_score: confidenceScore,
          is_active: form.is_active,
        },
      });

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

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "approved_updated",
      entity_type: "approved_answer",
      entity_id: selectedAnswer.id,
      details: {
        question: trimmedQuestion,
        normalized_question: normalized,
        category: form.category.trim() || null,
        priority,
        confidence_score: confidenceScore,
        is_active: form.is_active,
      },
    });

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

  async function replaceVersion() {
    if (!selectedAnswer) return;

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

    if (
      !Number.isFinite(confidenceScore) ||
      confidenceScore < 0 ||
      confidenceScore > 1
    ) {
      setErrorMessage("Confidence score must be between 0 and 1.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setActionMessage(null);

    const newVersion = (selectedAnswer.approved_version ?? 1) + 1;

    const { data: newRow, error: insertError } = await supabase
      .from("ai_approved_answers")
      .insert({
        question: trimmedQuestion,
        normalized_question: normalizeQuestion(trimmedQuestion),
        answer: trimmedAnswer,
        category: form.category.trim() || null,
        priority,
        confidence_score: confidenceScore,
        is_active: true,
        approved_version: newVersion,
        source_cache_id: selectedAnswer.source_cache_id,
      })
      .select(
        "id, question, normalized_question, answer, category, is_active, priority, created_at, updated_at, source_cache_id, usage_count, confidence_score, last_used_at, demoted_at, approved_version, replaced_by_id"
      )
      .single();

    if (insertError) {
      setErrorMessage(insertError.message);
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("ai_approved_answers")
      .update({
        is_active: false,
        replaced_by_id: (newRow as ApprovedAnswerRow).id,
      })
      .eq("id", selectedAnswer.id);

    if (updateError) {
      setErrorMessage(updateError.message);
      setSaving(false);
      return;
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "approved_version_replaced",
      entity_type: "approved_answer",
      entity_id: (newRow as ApprovedAnswerRow).id,
      details: {
        old_answer_id: selectedAnswer.id,
        new_answer_id: (newRow as ApprovedAnswerRow).id,
        question: trimmedQuestion,
        normalized_question: normalizeQuestion(trimmedQuestion),
        previous_version: selectedAnswer.approved_version ?? 1,
        new_version: newVersion,
      },
    });

    await loadApprovedAnswers();

    setSelectedId((newRow as ApprovedAnswerRow).id);
    setIsCreating(false);
    setActionMessage("New version created and old version archived.");
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

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: (data as ApprovedAnswerRow).is_active
        ? "approved_activated"
        : "approved_deactivated",
      entity_type: "approved_answer",
      entity_id: answer.id,
      details: {
        question: answer.question,
        normalized_question: answer.normalized_question,
        is_active: (data as ApprovedAnswerRow).is_active,
      },
    });

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
      ? "Approved Answer"
      : "Select Approved Answer";

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-[#05070d] px-6 py-6 text-white">
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col gap-6">
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
                  Trusted Answers
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                    Approved Answers
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Manage answers the assistant should trust first. These responses are checked before saved replies,
                    similar matches, and AI fallback.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[460px]">
              <SummaryCard label="Active" value={activeCount} tone="emerald" />
              <SummaryCard label="Paused" value={inactiveCount} tone="amber" />
              <SummaryCard label="Top Priority" value={topPriorityCount} tone="cyan" />
              <SummaryCard label="Total Uses" value={totalUsage} tone="white" />
            </div>
          </div>
        </header>

                <section className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Trusted Answer List
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Answers the AI checks before cache and model fallback.
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
                      New Answer
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search trusted answers..."
                      className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-9 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target.value as "all" | "active" | "inactive"
                      )
                    }
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-300 focus:border-cyan-400/40 focus:outline-none"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Paused</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-300 focus:border-cyan-400/40 focus:outline-none"
                  >
                    <option value="all">All Groups</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {loading ? (
                  <div className="px-5 py-6 text-sm text-slate-400">
                    Loading approved answers...
                  </div>
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
                            isSelected ? "bg-cyan-500/10" : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 space-y-1">
                              <p className="line-clamp-2 text-sm font-semibold text-white">
                                {answer.question}
                              </p>
                              <p className="text-xs text-slate-500">
                                {getCategoryLabel(answer.category)} · Priority {answer.priority}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              {answer.is_active ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <XCircle className="h-4 w-4 text-amber-400" />
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] ${statusChipClass(
                                answer.is_active
                              )}`}
                            >
                              {answer.is_active ? "Active" : "Paused"}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] ${priorityChipClass(
                                answer.priority
                              )}`}
                            >
                              Priority {answer.priority}
                            </span>

                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400">
                              Used {answer.usage_count ?? 0}
                            </span>

                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400">
                              Confidence {confidencePercent(answer.confidence_score)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto overscroll-contain pr-1">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {pageTitle}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Create, edit, activate, pause, or replace a trusted answer.
                </p>
              </div>

              <div className="flex flex-col gap-4 px-5 py-5">
                <FormField label="Question">
                  <input
                    value={form.question}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        question: event.target.value,
                      }))
                    }
                    placeholder="Question the user may ask..."
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                  />
                </FormField>

                <FormField label="Answer">
                  <textarea
                    rows={8}
                    value={form.answer}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        answer: event.target.value,
                      }))
                    }
                    placeholder="Trusted answer the assistant should use..."
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm leading-6 text-white focus:border-cyan-400/40 focus:outline-none"
                  />
                </FormField>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Group">
                    <input
                      value={form.category}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                      placeholder="Example: finance"
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                    />
                  </FormField>

                  <FormField label="Priority">
                    <input
                      type="number"
                      value={form.priority}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          priority: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                    />
                  </FormField>
                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Confidence">
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
                  </FormField>

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
                    Active trusted answer
                  </label>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <SlidersHorizontal className="h-4 w-4" />
                    Router Details
                  </div>

                  <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
                    <InfoValue
                      label="Normalized Question"
                      value={normalizeQuestion(form.question) || "—"}
                    />
                    <InfoValue
                      label="Last Used"
                      value={formatDate(selectedAnswer?.last_used_at ?? null)}
                    />
                    <InfoValue
                      label="Usage Count"
                      value={String(selectedAnswer?.usage_count ?? 0)}
                    />
                    <InfoValue
                      label="Version"
                      value={String(selectedAnswer?.approved_version ?? 1)}
                    />
                  </div>
                </div>

                {duplicates.length > 0 ? (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-amber-300">
                      Duplicate Warning
                    </div>

                    <div className="mt-2 text-sm text-amber-200">
                      This question has {duplicates.length} duplicate trusted answer
                      {duplicates.length === 1 ? "" : "s"}. Deactivate or replace the duplicates
                      to avoid inconsistent results.
                    </div>

                    <div className="mt-3 space-y-2">
                      {duplicates.map((duplicate) => (
                        <div
                          key={duplicate.id}
                          className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/70"
                        >
                          <div className="font-medium text-white">
                            {duplicate.question}
                          </div>
                          <div className="mt-1 text-white/40">
                            Priority {duplicate.priority} ·{" "}
                            {duplicate.is_active ? "Active" : "Paused"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

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
                    {saving
                      ? "Saving..."
                      : isCreating
                        ? "Create Answer"
                        : "Save Changes"}
                  </button>

                  {selectedAnswer && !isCreating ? (
                    <button
                      type="button"
                      onClick={() => void replaceVersion()}
                      disabled={saving}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:border-amber-300/60 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Replace Version
                    </button>
                  ) : null}

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
                          Pause
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

            <div className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <FileCheck2 className="h-4 w-4" />
                Router Rule
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Active approved answers are checked before saved replies, semantic
                cache, and OpenAI fallback. Keep them accurate, specific, and easy to reuse.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
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

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function InfoValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 break-words text-slate-200">{value}</p>
    </div>
  );
}
