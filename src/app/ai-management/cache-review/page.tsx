import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Brain,
  Database,
  FileCheck2,
  Pencil,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type CacheItem = {
  id: string;
  question: string;
  normalized_question: string;
  answer: string;
  provider: string | null;
  model: string | null;
  usage_count: number | null;
  is_blocked: boolean | null;
  created_at: string;
  updated_at: string | null;
  last_used_at: string | null;
  quality_score: number | null;
};

type CacheStatusFilter = "all" | "active" | "blocked";

type SimilarityRow = {
  id: string;
  question: string;
  answer: string;
  similarity: number;
};

type CacheEditorState = {
  question: string;
  normalized_question: string;
  answer: string;
  provider: string;
  model: string;
  usage_count: number;
  is_blocked: boolean;
};

const EMPTY_EDITOR: CacheEditorState = {
  question: "",
  normalized_question: "",
  answer: "",
  provider: "cache",
  model: "cached",
  usage_count: 1,
  is_blocked: false,
};

const buttonNeutralClass =
  "inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/75 transition-all duration-300 hover:bg-white/[0.08] hover:text-white";

const buttonPrimaryClass =
  "inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition-all duration-300 hover:bg-cyan-400 disabled:opacity-50";

const buttonDangerClass =
  "inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 transition-all duration-300 hover:bg-rose-500/20";

function normalizeQuestion(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function providerChipClass(provider: string | null | undefined) {
  const safe = (provider ?? "unknown").toLowerCase();

  if (safe === "semantic-cache") {
    return "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200";
  }

  if (safe === "cache") {
    return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
  }

  if (safe === "approved-knowledge") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  }

  if (safe === "openai") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-200";
  }

  return "border-white/10 bg-white/[0.05] text-white/55";
}

function statusChipClass(isBlocked: boolean) {
  if (isBlocked) {
    return "border-rose-400/20 bg-rose-500/10 text-rose-300";
  }

  return "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
}

function scoreCacheQuality(item: CacheItem) {
  let score = 100;

  const answer = (item.answer ?? "").trim();
  const question = (item.question ?? "").trim();
  const normalized = (item.normalized_question ?? "").trim();
  const provider = (item.provider ?? "unknown").toLowerCase();
  const usage = item.usage_count ?? 0;

  if (!question) score -= 40;
  if (!answer) score -= 60;
  if (answer.length < 30) score -= 18;
  if (answer.length > 1200) score -= 10;
  if (usage === 0) score -= 8;
  if (Boolean(item.is_blocked)) score -= 50;
  if (provider === "openai") score -= 6;
  if (provider === "semantic-cache") score += 4;
  if (normalized !== normalizeQuestion(question)) score -= 12;

  if (
    answer === "I do not have an approved answer for that yet." ||
    answer.toLowerCase().includes("i do not have an approved answer")
  ) {
    score -= 25;
  }

  return Math.max(0, Math.min(100, score));
}

function inferCacheRisk(item: CacheItem) {
  const answer = (item.answer ?? "").trim();
  const question = (item.question ?? "").trim();
  const normalized = (item.normalized_question ?? "").trim();

  if (Boolean(item.is_blocked)) return "blocked";
  if (!answer) return "empty-answer";
  if (!question) return "empty-question";
  if (normalized !== normalizeQuestion(question)) return "normalization-mismatch";
  if (answer.length < 30) return "too-short";
  if (
    answer === "I do not have an approved answer for that yet." ||
    answer.toLowerCase().includes("i do not have an approved answer")
  ) {
    return "fallback-cached";
  }

  return "healthy";
}

function riskChipClass(risk: string) {
  if (risk === "healthy") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
  }

  if (risk === "normalization-mismatch" || risk === "too-short") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-300";
  }

  return "border-rose-400/20 bg-rose-500/10 text-rose-300";
}

function riskLabel(risk: string) {
  switch (risk) {
    case "healthy":
      return "healthy";
    case "blocked":
      return "blocked";
    case "empty-answer":
      return "empty answer";
    case "empty-question":
      return "empty question";
    case "normalization-mismatch":
      return "normalization mismatch";
    case "too-short":
      return "too short";
    case "fallback-cached":
      return "fallback cached";
    default:
      return "review";
  }
}

function toEditorState(item: CacheItem): CacheEditorState {
  return {
    question: item.question ?? "",
    normalized_question: item.normalized_question ?? "",
    answer: item.answer ?? "",
    provider: item.provider ?? "cache",
    model: item.model ?? "cached",
    usage_count: item.usage_count ?? 1,
    is_blocked: Boolean(item.is_blocked),
  };
}

export default function AICacheReviewPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<CacheItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<CacheStatusFilter>("all");

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorItemId, setEditorItemId] = useState<string | null>(null);
  const [editorForm, setEditorForm] = useState<CacheEditorState>(EMPTY_EDITOR);

  const [pageError, setPageError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [similarityRows, setSimilarityRows] = useState<SimilarityRow[]>([]);
  const [similarityLoading, setSimilarityLoading] = useState(false);

  
    async function loadSemanticDiagnostics(item: CacheItem) {
    setSimilarityLoading(true);

    const { data, error } = await supabase.rpc("debug_ai_cache_similarity", {
      p_question: item.question,
    });

    if (error) {
      setSimilarityRows([]);
      setSimilarityLoading(false);
      return;
    }

    setSimilarityRows((data ?? []) as SimilarityRow[]);
    setSimilarityLoading(false);
  }
  
  async function loadCacheItems(showRefreshing = false) {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setPageError(null);

    const { data, error } = await supabase
      .from("ai_qa_cache")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(300);

    if (error) {
      setPageError(error.message);
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const nextItems = (data ?? []) as CacheItem[];
    setItems(nextItems);

    if (!selectedItemId && nextItems.length > 0) {
      setSelectedItemId(nextItems[0].id);
    }

    if (selectedItemId && nextItems.every((item) => item.id !== selectedItemId)) {
      setSelectedItemId(nextItems[0]?.id ?? null);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    void loadCacheItems();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = search.toLowerCase();

      const matchesSearch =
        item.question.toLowerCase().includes(q) ||
        item.normalized_question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        (item.provider ?? "").toLowerCase().includes(q) ||
        (item.model ?? "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "blocked"
          ? Boolean(item.is_blocked)
          : !item.is_blocked;

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

const selectedItem =
  items.find((item) => item.id === selectedItemId) ??
  filteredItems[0] ??
  null;

useEffect(() => {
  if (!selectedItem) {
    setSimilarityRows([]);
    return;
  }

  void loadSemanticDiagnostics(selectedItem);
}, [selectedItem?.id]);

   const summary = useMemo(() => {
    const blocked = items.filter((item) => Boolean(item.is_blocked)).length;
    const active = items.filter((item) => !item.is_blocked).length;
    const semantic = items.filter(
      (item) => (item.provider ?? "").toLowerCase() === "semantic-cache"
    ).length;
    const totalUsage = items.reduce(
      (sum, item) => sum + (item.usage_count ?? 0),
      0
    );
    const weak = items.filter((item) => scoreCacheQuality(item) < 70).length;
    const risky = items.filter(
      (item) => inferCacheRisk(item) !== "healthy"
    ).length;

    return {
      total: items.length,
      active,
      blocked,
      semantic,
      usage: totalUsage,
      weak,
      risky,
    };
  }, [items]);

  function resetEditor() {
    setEditorItemId(null);
    setEditorForm(EMPTY_EDITOR);
  }

  function openEditEditor(item: CacheItem) {
    setEditorItemId(item.id);
    setEditorForm(toEditorState(item));
    setEditorOpen(true);
    setActionMessage(null);
  }

  async function saveEditor() {
    if (!editorItemId) return;

    if (!editorForm.question.trim()) {
      setPageError("Question is required.");
      return;
    }

    if (!editorForm.answer.trim()) {
      setPageError("Answer is required.");
      return;
    }

    setSaving(true);
    setPageError(null);
    setActionMessage(null);

    const payload = {
      question: editorForm.question.trim(),
      normalized_question:
        editorForm.normalized_question.trim() ||
        normalizeQuestion(editorForm.question),
      answer: editorForm.answer.trim(),
      provider: editorForm.provider.trim() || "cache",
      model: editorForm.model.trim() || "cached",
      usage_count: Math.max(0, Number(editorForm.usage_count) || 0),
      is_blocked: editorForm.is_blocked,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("ai_qa_cache")
      .update(payload)
      .eq("id", editorItemId);

    if (error) {
      setPageError(error.message);
      setSaving(false);
      return;
    }

    setEditorOpen(false);
    resetEditor();
    setActionMessage("Cache item updated.");
    await loadCacheItems(true);
    setSaving(false);
  }

  async function toggleBlocked(item: CacheItem) {
    setPageError(null);
    setActionMessage(null);

    const nextBlocked = !Boolean(item.is_blocked);

    const { error } = await supabase
      .from("ai_qa_cache")
      .update({
        is_blocked: nextBlocked,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      setPageError(error.message);
      return;
    }

    setActionMessage(
      nextBlocked ? "Cache item blocked." : "Cache item unblocked."
    );
    await loadCacheItems(true);
  }

  async function deleteItem(item: CacheItem) {
    const confirmed = window.confirm(
      `Delete this cache item for "${item.question}" permanently?`
    );

    if (!confirmed) return;

    setPageError(null);
    setActionMessage(null);

    const { error } = await supabase
      .from("ai_qa_cache")
      .delete()
      .eq("id", item.id);

    if (error) {
      setPageError(error.message);
      return;
    }

    if (selectedItemId === item.id) {
      setSelectedItemId(null);
    }

    setActionMessage("Cache item deleted.");
    await loadCacheItems(true);
  }

   async function promoteToApproved(item: CacheItem) {
    const quality = scoreCacheQuality(item);
    const risk = inferCacheRisk(item);

    if (Boolean(item.is_blocked)) {
      setPageError("Blocked cache items cannot be promoted.");
      return;
    }

    if (risk !== "healthy") {
      setPageError("Only healthy cache items should be promoted.");
      return;
    }

    if (quality < 75 || item.quality_score < 1 || item.usage_count < 3) {
      setPageError("Cache quality is too low for promotion.");
      return;
    }

    setPromoting(true);
    setPageError(null);
    setActionMessage(null);

    const payload = {
      normalized_question:
        item.normalized_question || normalizeQuestion(item.question),
      answer: item.answer,
      is_active: true,
      priority: 100,
    };

    const { error } = await supabase
      .from("ai_approved_answers")
      .insert(payload);

    if (error) {
      setPageError(error.message);
      setPromoting(false);
      return;
    }

    setActionMessage("Cache item promoted to approved answers.");
    setPromoting(false);
  }

  return (
    <div className="grid min-h-[calc(100vh-165px)] grid-rows-[auto_auto_minmax(0,1fr)] gap-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/ai-management")}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/70 hover:bg-white/[0.08]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadCacheItems(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/70 hover:bg-white/[0.08]"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* SUMMARY */}
       <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard label="Total" value={summary.total} />
        <SummaryCard label="Active" value={summary.active} />
        <SummaryCard label="Blocked" value={summary.blocked} />
        <SummaryCard label="Semantic" value={summary.semantic} />
        <SummaryCard label="Weak" value={summary.weak} />
        <SummaryCard label="Usage" value={summary.usage} />
      </div>

            {(pageError || actionMessage) && (
        <div className="space-y-2">
          {pageError && (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {pageError}
            </div>
          )}

          {actionMessage && (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {actionMessage}
            </div>
          )}
        </div>
      )}
      
      {/* MAIN GRID */}
      <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_420px]">
        {/* LEFT — LIST */}
        <div className="rounded-[26px] border border-white/10 bg-black/20 overflow-hidden">
          {/* SEARCH */}
          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <Search className="h-4 w-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cache..."
              className="w-full bg-transparent outline-none text-sm text-white/80 placeholder:text-white/30"
            />
          </div>

          {/* FILTERS */}
          <div className="p-4 border-b border-white/5 flex gap-2">
            {["all", "active", "blocked"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f as CacheStatusFilter)}
                className={`px-3 py-1 rounded-xl text-xs border ${
                  statusFilter === f
                    ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
                    : "border-white/10 text-white/60 hover:bg-white/[0.05]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* LIST */}
          <div className="max-h-[600px] overflow-y-auto">
            {filteredItems.map((item) => {
              const selected = item.id === selectedItem?.id;
      
      return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`p-4 border-b border-white/5 cursor-pointer transition ${
                    selected
                      ? "bg-cyan-500/[0.08]"
                      : "hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="text-sm text-white/90 line-clamp-2">
                    {item.question}
                  </div>

                                 <div className="mt-2 flex gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 text-[11px] rounded-full border ${providerChipClass(
                        item.provider
                      )}`}
                    >
                      {item.provider}
                    </span>

                    <span
                      className={`px-2 py-0.5 text-[11px] rounded-full border ${statusChipClass(
                        Boolean(item.is_blocked)
                      )}`}
                    >
                      {item.is_blocked ? "blocked" : "active"}
                    </span>

                    <span
                      className={`px-2 py-0.5 text-[11px] rounded-full border ${riskChipClass(
                        inferCacheRisk(item)
                      )}`}
                    >
                      {riskLabel(inferCacheRisk(item))}
                    </span>

                    <span className="px-2 py-0.5 text-[11px] rounded-full border border-white/10 bg-white/[0.04] text-white/60">
                      q{scoreCacheQuality(item)}
                    </span>
                  </div>
                </div>
              );
            })}

            {!loading && filteredItems.length === 0 && (
              <div className="p-6 text-center text-white/40">
                No results
              </div>
            )}
          </div>
        </div>
        
        {/* RIGHT — INSPECTOR */}
        <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
          {!selectedItem ? (
            <div className="text-white/40 text-sm">
              Select a cache item
            </div>
          ) : (
            <>
              <div className="text-lg text-white font-medium">
                Cache Inspector
              </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InsightCard
                  icon={Sparkles}
                  label="Quality Score"
                  value={`${scoreCacheQuality(selectedItem)}/100`}
                />
                <InsightCard
                  icon={ShieldAlert}
                  label="Risk"
                  value={riskLabel(inferCacheRisk(selectedItem))}
                />
                <InsightCard
                  icon={Database}
                  label="Provider"
                  value={selectedItem.provider || "unknown"}
                />
                <InsightCard
                  icon={Brain}
                  label="Usage Count"
                  value={String(selectedItem.usage_count ?? 0)}
                />
                <InsightCard
                  icon={Sparkles}
                  label="Quality Score"
                  value={String(selectedItem.quality_score ?? 0)}
                />

                <InsightCard
                 icon={Database}
                 label="Last Used"
                 value={formatDateTime(selectedItem.last_used_at)}
                 />
              </div>

                           <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">
                      Semantic Diagnostics
                      

{duplicates.length > 0 && (
  <div className="mt-5 rounded-[22px] border border-amber-400/20 bg-amber-500/10 p-4">
    <div className="text-sm text-amber-200">
      Duplicate Entries ({duplicates.length})
    </div>

    <div className="mt-2 space-y-2">
      {duplicates.map((dup) => (
        <div
          key={dup.id}
          className="rounded-xl border border-white/10 bg-black/20 p-2 text-xs text-white/60"
        >
          {dup.question}
        </div>
      ))}
    </div>
  </div>
)}
                      
                    </div>
                    <div className="mt-1 text-xs text-white/40">
                      Closest cache matches from vector similarity.
                    </div>
                  </div>

                  <button
                    onClick={() => void loadSemanticDiagnostics(selectedItem)}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {similarityLoading && (
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-white/40">
                      Loading semantic matches...
                    </div>
                  )}

                  {!similarityLoading && similarityRows.length === 0 && (
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-white/40">
                      No embedding diagnostics available for this cache item.
                    </div>
                  )}

                  {!similarityLoading &&
                    similarityRows.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 truncate text-xs text-white/70">
                            {row.question}
                          </div>

                          <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-200">
                            {Number(row.similarity).toFixed(3)}
                          </span>
                        </div>

                        <div className="mt-2 line-clamp-2 text-xs leading-5 text-white/40">
                          {row.answer}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              <div className="mt-5 space-y-3 text-sm">
                <Field label="Question" value={selectedItem.question} />
                <Field label="Normalized" value={selectedItem.normalized_question} />
                <Field
                  label="Normalization Check"
                  value={
                    selectedItem.normalized_question ===
                    normalizeQuestion(selectedItem.question)
                      ? "match"
                      : "mismatch"
                  }
                />
                <Field label="Answer" value={selectedItem.answer} multiline />
                <Field label="Provider" value={selectedItem.provider} />
                <Field label="Model" value={selectedItem.model} />
                <Field
                  label="Created"
                  value={formatDateTime(selectedItem.created_at)}
                />
                <Field
                  label="Updated"
                  value={formatDateTime(selectedItem.updated_at)}
                />
              </div>

              {/* ACTIONS */}
             {inferCacheRisk(selectedItem) !== "healthy" && (
                <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                  This cache item has a review flag. Fix it before promoting to approved answers.
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => openEditEditor(selectedItem)}
                  className={buttonNeutralClass}
                >
                  <Pencil className="h-4 w-4" /> Edit
                </button>

                <button
                  onClick={() => toggleBlocked(selectedItem)}
                  className={buttonNeutralClass}
                >
                  {selectedItem.is_blocked ? (
                    <>
                      <BadgeCheck className="h-4 w-4" /> Unblock
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4" /> Block
                    </>
                  )}
                </button>

                <button
                  onClick={() => promoteToApproved(selectedItem)}
                  className={buttonNeutralClass}
                >
                  <FileCheck2 className="h-4 w-4" /> {promoting ? "Promoting..." : "Promote"}
                </button>

                <button
                  onClick={() => deleteItem(selectedItem)}
                  className={buttonDangerClass}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editorOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[26px] p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-lg text-white">Edit Cache Item</div>
              <button onClick={() => setEditorOpen(false)}>
                <X />
              </button>
            </div>

            <Input
              label="Question"
              value={editorForm.question}
              onChange={(v) =>
                setEditorForm({ ...editorForm, question: v })
              }
            />

            <Textarea
              label="Answer"
              value={editorForm.answer}
              onChange={(v) =>
                setEditorForm({ ...editorForm, answer: v })
              }
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditorOpen(false)}
                className={buttonNeutralClass}
              >
                Cancel
              </button>

              <button
                onClick={saveEditor}
                disabled={saving}
                className={buttonPrimaryClass}
              >
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   SMALL UI COMPONENTS
========================= */

function InsightCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-white/40">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-2 text-sm text-white/85">{value}</div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
      <div className="text-xs text-white/40">{label}</div>
      <div className="text-lg text-white mt-1">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-white/40">{label}</div>
      <div
        className={`mt-1 text-white/80 ${
          multiline ? "whitespace-pre-wrap" : ""
        }`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-xs text-white/40">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-black/30 border border-white/10 rounded-xl p-2 text-white text-sm"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-xs text-white/40">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="mt-1 w-full bg-black/30 border border-white/10 rounded-xl p-2 text-white text-sm"
      />
    </div>
  );
}
