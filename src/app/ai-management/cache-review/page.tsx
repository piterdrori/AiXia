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
type CacheViewMode = "items" | "clusters";

type CacheCluster = {
  normalized_question: string;
  items: CacheItem[];
  bestItem: CacheItem;
  totalUsage: number;
  activeCount: number;
  blockedCount: number;
};

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
  "inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white";

const buttonPrimaryClass =
  "inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50";

const buttonDangerClass =
  "inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 transition hover:bg-rose-500/20";

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

function providerLabel(provider: string | null | undefined) {
  const safe = (provider ?? "unknown").toLowerCase();

  if (safe === "semantic-cache") return "Similar match";
  if (safe === "cache") return "Saved reply";
  if (safe === "approved-knowledge") return "Approved source";
  if (safe === "openai") return "AI generated";

  return provider || "Unknown";
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

  return "border-white/10 bg-white/[0.05] text-slate-400";
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
      return "Ready";
    case "blocked":
      return "Blocked";
    case "empty-answer":
      return "Missing answer";
    case "empty-question":
      return "Missing question";
    case "normalization-mismatch":
      return "Needs cleanup";
    case "too-short":
      return "Too short";
    case "fallback-cached":
      return "Bad fallback saved";
    default:
      return "Review";
  }
}

function getPromotionBlockReason(item: CacheItem) {
  const quality = scoreCacheQuality(item);
  const risk = inferCacheRisk(item);

  if (Boolean(item.is_blocked)) {
    return "This saved reply is blocked. Unblock it before approving it.";
  }

  if (risk !== "healthy") {
    return `This saved reply needs review first. Current issue: ${riskLabel(risk)}.`;
  }

  if (quality < 75) {
    return `This saved reply quality is too low. Current quality: ${quality}/100. Required: 75/100.`;
  }

  return null;
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
  const [statusFilter, setStatusFilter] = useState<CacheStatusFilter>("all");
  const [viewMode, setViewMode] = useState<CacheViewMode>("items");

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
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.normalized_question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        (item.provider ?? "").toLowerCase().includes(query) ||
        (item.model ?? "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "blocked"
            ? Boolean(item.is_blocked)
            : !item.is_blocked;

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

   const cacheClusters = useMemo<CacheCluster[]>(() => {
    const groups = new Map<string, CacheItem[]>();

    for (const item of filteredItems) {
      const key = item.normalized_question || normalizeQuestion(item.question);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }

    return Array.from(groups.entries())
      .map(([normalized_question, groupItems]) => {
        const sorted = [...groupItems].sort((a, b) => {
          const aScore =
            (a.is_blocked ? -1000 : 0) +
            scoreCacheQuality(a) +
            (a.quality_score ?? 0) * 20 +
            (a.usage_count ?? 0) * 2;

          const bScore =
            (b.is_blocked ? -1000 : 0) +
            scoreCacheQuality(b) +
            (b.quality_score ?? 0) * 20 +
            (b.usage_count ?? 0) * 2;

          return bScore - aScore;
        });

        return {
          normalized_question,
          items: sorted,
          bestItem: sorted[0],
          totalUsage: sorted.reduce(
            (sum, item) => sum + (item.usage_count ?? 0),
            0
          ),
          activeCount: sorted.filter((item) => !item.is_blocked).length,
          blockedCount: sorted.filter((item) => Boolean(item.is_blocked)).length,
        };
      })
      .sort((a, b) => b.totalUsage - a.totalUsage);
  }, [filteredItems]);

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
    const similarMatches = items.filter(
      (item) => (item.provider ?? "").toLowerCase() === "semantic-cache"
    ).length;
    const totalUsage = items.reduce(
      (sum, item) => sum + (item.usage_count ?? 0),
      0
    );
    const weak = items.filter((item) => scoreCacheQuality(item) < 70).length;
    const reviewNeeded = items.filter(
      (item) => inferCacheRisk(item) !== "healthy"
    ).length;

    return {
      total: items.length,
      active,
      blocked,
      similarMatches,
      usage: totalUsage,
      weak,
      reviewNeeded,
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
    setPageError(null);
  }

  async function saveEditor() {
    if (!editorItemId) return;

    if (!editorForm.question.trim()) {
      setPageError("Please add the question.");
      return;
    }

    if (!editorForm.answer.trim()) {
      setPageError("Please add the answer.");
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

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "cache_updated",
      entity_type: "cache",
      entity_id: editorItemId,
      details: {
        question: payload.question,
        provider: payload.provider,
        is_blocked: payload.is_blocked,
      },
    });

    setEditorOpen(false);
    resetEditor();
    setActionMessage("Saved reply updated.");
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

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: nextBlocked ? "cache_blocked" : "cache_unblocked",
      entity_type: "cache",
      entity_id: item.id,
      details: {
        question: item.question,
        is_blocked: nextBlocked,
      },
    });

    setActionMessage(
      nextBlocked
        ? "Saved reply blocked. The assistant will not reuse it."
        : "Saved reply unblocked. The assistant can reuse it again."
    );

    await loadCacheItems(true);
  }

  async function deleteItem(item: CacheItem) {
    const confirmed = window.confirm(
      `Delete this saved reply for "${item.question}" permanently?`
    );

    if (!confirmed) return;

    setPageError(null);
    setActionMessage(null);

    const { error } = await supabase.from("ai_qa_cache").delete().eq("id", item.id);

    if (error) {
      setPageError(error.message);
      return;
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "cache_deleted",
      entity_type: "cache",
      entity_id: item.id,
      details: {
        question: item.question,
      },
    });

    if (selectedItemId === item.id) {
      setSelectedItemId(null);
    }

    setActionMessage("Saved reply deleted.");
    await loadCacheItems(true);
  }

  const duplicates = selectedItem
    ? items.filter(
        (item) =>
          item.normalized_question === selectedItem.normalized_question &&
          item.id !== selectedItem.id
      )
    : [];

  async function autoCleanDuplicates() {
    if (!selectedItem || duplicates.length === 0) return;

    const confirmed = window.confirm(
      `Pause ${duplicates.length} duplicate saved repl${
        duplicates.length === 1 ? "y" : "ies"
      } for "${selectedItem.normalized_question}"?`
    );

    if (!confirmed) return;

    setPageError(null);
    setActionMessage(null);

    const duplicateIds = duplicates.map((item) => item.id);

    const { error } = await supabase
      .from("ai_qa_cache")
      .update({
        is_blocked: true,
        admin_notes: "Auto-cleaned duplicate from cache review UI.",
        updated_at: new Date().toISOString(),
      })
      .in("id", duplicateIds);

    if (error) {
      setPageError(error.message);
      return;
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "cache_duplicates_cleaned",
      entity_type: "cache",
      entity_id: selectedItem.id,
      details: {
        normalized_question: selectedItem.normalized_question,
        cleaned_count: duplicateIds.length,
      },
    });

    setActionMessage(`Paused ${duplicateIds.length} duplicate saved repl${duplicateIds.length === 1 ? "y" : "ies"}.`);
    await loadCacheItems(true);
  }

  async function promoteToApproved(item: CacheItem): Promise<boolean> {
    const blockReason = getPromotionBlockReason(item);

    if (blockReason) {
      setPageError(blockReason);
      setActionMessage(null);
      return false;
    }

    setPromoting(true);
    setPageError(null);
    setActionMessage(null);

    const normalized = item.normalized_question || normalizeQuestion(item.question);

    const { data: existing, error: existingError } = await supabase
      .from("ai_approved_answers")
      .select("id")
      .eq("normalized_question", normalized)
      .limit(1);

    if (existingError) {
      setPageError(existingError.message);
      setPromoting(false);
      return false;
    }

    if (existing && existing.length > 0) {
      const existingId = existing[0].id;

      const { data: current } = await supabase
        .from("ai_approved_answers")
        .select("approved_version")
        .eq("id", existingId)
        .single();

      const newVersion = (current?.approved_version ?? 1) + 1;

      const { data: newRow, error: insertError } = await supabase
        .from("ai_approved_answers")
        .insert({
          question: item.question,
          normalized_question: normalized,
          answer: item.answer,
          category: null,
          is_active: true,
          priority: 100,
          confidence_score: 1,
          approved_version: newVersion,
          source_cache_id: item.id,
        })
        .select("id")
        .single();

      if (insertError || !newRow) {
        setPageError(insertError?.message ?? "Could not approve this saved reply.");
        setPromoting(false);
        return false;
      }

      const { error: updateError } = await supabase
        .from("ai_approved_answers")
        .update({
          is_active: false,
          replaced_by_id: newRow.id,
        })
        .eq("id", existingId);

      if (!updateError) {
        await supabase.from("ai_admin_activity_logs").insert({
          action_type: "cache_promoted",
          entity_type: "cache",
          entity_id: item.id,
          details: {
            question: item.question,
            normalized_question: normalized,
            replaced_existing: true,
          },
        });
      }

      if (updateError) {
        setPageError(updateError.message);
        setPromoting(false);
        return false;
      }

      setActionMessage("Saved reply approved.");
      setPromoting(false);
      return true;
    }

    const { error } = await supabase.from("ai_approved_answers").insert({
      question: item.question,
      normalized_question: normalized,
      answer: item.answer,
      category: null,
      is_active: true,
      priority: 100,
      confidence_score: 1,
      approved_version: 1,
      source_cache_id: item.id,
    });

    if (!error) {
      await supabase.from("ai_admin_activity_logs").insert({
        action_type: "cache_promoted",
        entity_type: "cache",
        entity_id: item.id,
        details: {
          question: item.question,
          normalized_question: normalized,
        },
      });
    }

    if (error) {
      setPageError(error.message);
      setPromoting(false);
      return false;
    }

    setActionMessage("Saved reply approved.");
    setPromoting(false);
    return true;
  }
    async function autoPromoteBestClusters() {
    const confirmed = window.confirm(
      "Approve the best ready saved reply from each duplicate group?"
    );

    if (!confirmed) return;

    setPromoting(true);
    setPageError(null);
    setActionMessage(null);

    let promotedCount = 0;
    let skippedCount = 0;
    let skippedBlocked = 0;
    let skippedRisk = 0;
    let skippedQuality = 0;
    let skippedDbQuality = 0;
    let skippedUsage = 0;
    let skippedExistingBetter = 0;
    let skippedError = 0;

    for (const cluster of cacheClusters) {
      const bestItem = cluster.bestItem;
      const quality = scoreCacheQuality(bestItem);
      const risk = inferCacheRisk(bestItem);

      if (Boolean(bestItem.is_blocked)) {
        skippedBlocked += 1;
        skippedCount += 1;
        continue;
      }

      if (risk !== "healthy") {
        skippedRisk += 1;
        skippedCount += 1;
        continue;
      }

      if (quality < 75) {
        skippedQuality += 1;
        skippedCount += 1;
        continue;
      }

      if ((bestItem.quality_score ?? 0) < 1) {
        skippedDbQuality += 1;
        skippedCount += 1;
        continue;
      }

      if ((bestItem.usage_count ?? 0) < 3) {
        skippedUsage += 1;
        skippedCount += 1;
        continue;
      }

      const normalized =
        bestItem.normalized_question || normalizeQuestion(bestItem.question);

      const { data: existing, error: existingError } = await supabase
        .from("ai_approved_answers")
        .select("id, approved_version, answer, usage_count")
        .eq("normalized_question", normalized)
        .limit(1);

      if (existingError) {
        skippedError += 1;
        skippedCount += 1;
        continue;
      }

      if (existing && existing.length > 0) {
        const existingRow = existing[0];
        const existingId = existingRow.id;

        const existingScore =
          (existingRow.usage_count ?? 0) * 2 +
          (existingRow.answer?.length ?? 0) / 10;

        const candidateScore =
          (bestItem.usage_count ?? 0) * 2 +
          (bestItem.answer?.length ?? 0) / 10;

        if (candidateScore <= existingScore) {
          skippedExistingBetter += 1;
          skippedCount += 1;
          continue;
        }

        const newVersion = (existingRow.approved_version ?? 1) + 1;

        const { data: newRow, error: insertError } = await supabase
          .from("ai_approved_answers")
          .insert({
            question: bestItem.question,
            normalized_question: normalized,
            answer: bestItem.answer,
            category: null,
            is_active: true,
            priority: 100,
            confidence_score: 1,
            approved_version: newVersion,
            source_cache_id: bestItem.id,
          })
          .select("id")
          .single();

        if (insertError || !newRow) {
          skippedError += 1;
          skippedCount += 1;
          continue;
        }

        const { error: updateError } = await supabase
          .from("ai_approved_answers")
          .update({
            is_active: false,
            replaced_by_id: newRow.id,
          })
          .eq("id", existingId);

        if (updateError) {
          skippedError += 1;
          skippedCount += 1;
          continue;
        }

        promotedCount += 1;
        continue;
      }

      const { error } = await supabase.from("ai_approved_answers").insert({
        question: bestItem.question,
        normalized_question: normalized,
        answer: bestItem.answer,
        category: null,
        is_active: true,
        priority: 100,
        confidence_score: 1,
        approved_version: 1,
        source_cache_id: bestItem.id,
      });

      if (error) {
        skippedError += 1;
        skippedCount += 1;
        continue;
      }

      promotedCount += 1;
    }

    setActionMessage(
      `Auto approval complete. Approved ${promotedCount}, skipped ${skippedCount}. Reasons: blocked ${skippedBlocked}, review ${skippedRisk}, quality ${skippedQuality}, DB quality ${skippedDbQuality}, usage ${skippedUsage}, existing better ${skippedExistingBetter}, errors ${skippedError}.`
    );

    setPromoting(false);
  }

  async function runLearningLoop() {
    setPromoting(true);
    setPageError(null);
    setActionMessage(null);

    let improved = 0;
    let skipped = 0;

    const { data: logs, error: logError } = await supabase
      .from("ai_request_logs")
      .select("prompt, response_text")
      .order("created_at", { ascending: false })
      .limit(100);

    if (logError || !logs) {
      setPageError("Could not load recent AI requests.");
      setPromoting(false);
      return;
    }

    for (const log of logs) {
      const prompt = log.prompt || "";
      const response = log.response_text || "";

      const isWeak =
        !response ||
        response.length < 40 ||
        response.toLowerCase().includes("i do not know") ||
        response.toLowerCase().includes("not available");

      if (!isWeak) {
        skipped++;
        continue;
      }

      const normalized = normalizeQuestion(prompt);

      const cluster = cacheClusters.find(
        (candidate) => candidate.normalized_question === normalized
      );

      if (!cluster) {
        skipped++;
        continue;
      }

      const bestItem = cluster.bestItem;
      const quality = scoreCacheQuality(bestItem);
      const risk = inferCacheRisk(bestItem);

      if (
        risk !== "healthy" ||
        quality < 75 ||
        (bestItem.usage_count ?? 0) < 3
      ) {
        skipped++;
        continue;
      }

      const success = await promoteToApproved(bestItem);

      if (success) {
        improved++;
      } else {
        skipped++;
      }
    }

    setActionMessage(
      `Learning check complete. Improved ${improved}, skipped ${skipped}.`
    );

    setPromoting(false);
  }

  async function runFeedbackScoring() {
    setPromoting(true);
    setPageError(null);
    setActionMessage(null);

    let updated = 0;
    let skipped = 0;

    const { data: logs, error: logError } = await supabase
      .from("ai_request_logs")
      .select("prompt, response_text")
      .order("created_at", { ascending: false })
      .limit(200);

    if (logError || !logs) {
      setPageError("Could not load feedback logs.");
      setPromoting(false);
      return;
    }

    for (const log of logs) {
      const prompt = log.prompt || "";
      const response = log.response_text || "";
      const normalized = normalizeQuestion(prompt);

      const { data: approved } = await supabase
        .from("ai_approved_answers")
        .select("id, confidence_score, answer")
        .eq("normalized_question", normalized)
        .eq("is_active", true)
        .limit(1);

      if (!approved || approved.length === 0) {
        skipped++;
        continue;
      }

      const row = approved[0];
      let delta = 0;

      if (!response || response.length < 40) {
        delta = -0.1;
      } else if (response.length > 120) {
        delta = 0.05;
      }

      if (
        response.toLowerCase().includes("i do not know") ||
        response.toLowerCase().includes("not available")
      ) {
        delta = -0.2;
      }

      const newScore = Math.max(
        0,
        Math.min(1, (row.confidence_score ?? 0.5) + delta)
      );

      if (newScore === row.confidence_score) {
        skipped++;
        continue;
      }

      const { error } = await supabase
        .from("ai_approved_answers")
        .update({
          confidence_score: newScore,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (error) {
        skipped++;
        continue;
      }

      updated++;
    }

    setActionMessage(
      `Feedback scoring complete. Updated ${updated}, skipped ${skipped}.`
    );

    setPromoting(false);
  }

  return (
       <div className="h-[calc(100vh-64px)] overflow-hidden bg-[#05070d] px-6 py-6 text-white">
      <div className="mx-auto grid h-full w-full max-w-[1600px] gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-6">
            <button
              type="button"
              onClick={() => navigate("/ai-management")}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
            >
              <ArrowLeft className="h-4 w-4" />
              AI Studio
            </button>

            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Saved Replies
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                    Cache Review
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Review answers the assistant learned before they are reused too often.
                    Approve strong answers, pause bad ones, clean duplicates, and inspect similar matches.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void autoPromoteBestClusters()}
                  disabled={promoting}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileCheck2 className="h-4 w-4" />
                  {promoting ? "Working..." : "Approve Best"}
                </button>

                <button
                  type="button"
                  onClick={() => void runLearningLoop()}
                  disabled={promoting}
                  className="inline-flex items-center gap-2 rounded-2xl border border-purple-400/20 bg-purple-500/10 px-3 py-2 text-sm text-purple-200 transition hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Brain className="h-4 w-4" />
                  {promoting ? "Working..." : "Learning Check"}
                </button>

                <button
                  type="button"
                  onClick={() => void runFeedbackScoring()}
                  disabled={promoting}
                  className="inline-flex items-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-200 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  {promoting ? "Working..." : "Score Feedback"}
                </button>

                <button
                  type="button"
                  onClick={() => void loadCacheItems(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <SummaryCard label="Saved Replies" value={summary.total} tone="cyan" />
              <SummaryCard label="Reusable" value={summary.active} tone="emerald" />
              <SummaryCard label="Paused" value={summary.blocked} tone="rose" />
              <SummaryCard label="Similar Matches" value={summary.similarMatches} tone="violet" />
              <SummaryCard label="Need Review" value={summary.reviewNeeded} tone="amber" />
              <SummaryCard label="Total Uses" value={summary.usage} tone="white" />
            </div>
          </div>

          {(pageError || actionMessage) && (
            <div className="space-y-2 border-b border-white/10 px-6 py-4">
              {pageError ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {pageError}
                </div>
              ) : null}

              {actionMessage ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {actionMessage}
                </div>
              ) : null}
            </div>
          )}

          <div className="border-b border-white/10 px-6 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-[420px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search saved replies..."
                  className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30"
                />
              </div>

              <div className="flex flex-col gap-3 xl:items-end">
                <FilterGroup
                  label="Use"
                  value={statusFilter}
                  options={[
                    { value: "all", label: "All" },
                    { value: "active", label: "Reusable" },
                    { value: "blocked", label: "Paused" },
                  ]}
                  onChange={(value) => setStatusFilter(value as CacheStatusFilter)}
                />

                <FilterGroup
                  label="View"
                  value={viewMode}
                  options={[
                    { value: "items", label: "Replies" },
                    { value: "clusters", label: "Groups" },
                  ]}
                  onChange={(value) => setViewMode(value as CacheViewMode)}
                />
              </div>
            </div>
          </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
            {loading ? (
              <div className="grid gap-3">
                {[1, 2, 3, 4].map((row) => (
                  <div
                    key={row}
                    className="h-28 animate-pulse rounded-[26px] border border-white/10 bg-white/[0.03]"
                  />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400">
                  <Database className="h-6 w-6" />
                </div>

                <div className="mt-4 text-lg font-semibold text-white">
                  No saved replies found
                </div>

                <div className="mt-2 text-sm text-slate-500">
                  Try another search or change the filters.
                </div>
              </div>
            ) : viewMode === "items" ? (
              <div className="grid gap-3">
                {filteredItems.map((item) => (
                  <CacheReplyRow
                    key={item.id}
                    item={item}
                    selected={item.id === selectedItem?.id}
                    onSelect={() => setSelectedItemId(item.id)}
                    onEdit={() => openEditEditor(item)}
                    onToggle={() => void toggleBlocked(item)}
                    onPromote={() => void promoteToApproved(item)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-3">
                {cacheClusters.map((cluster) => (
                  <CacheGroupRow
                    key={cluster.normalized_question}
                    cluster={cluster}
                    selected={cluster.items.some(
                      (item) => item.id === selectedItem?.id
                    )}
                    onSelect={() => setSelectedItemId(cluster.bestItem.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <CacheReviewPanel
          selectedItem={selectedItem}
          duplicates={duplicates}
          similarityRows={similarityRows}
          similarityLoading={similarityLoading}
          promoting={promoting}
          onRefreshSimilarity={() => {
            if (selectedItem) void loadSemanticDiagnostics(selectedItem);
          }}
          onCleanDuplicates={() => void autoCleanDuplicates()}
          onEdit={() => {
            if (selectedItem) openEditEditor(selectedItem);
          }}
          onToggle={() => {
            if (selectedItem) void toggleBlocked(selectedItem);
          }}
          onPromote={() => {
            if (selectedItem) void promoteToApproved(selectedItem);
          }}
          onDelete={() => {
            if (selectedItem) void deleteItem(selectedItem);
          }}
        />
      </div>

      {editorOpen && (
        <CacheEditorModal
          form={editorForm}
          saving={saving}
          onClose={() => setEditorOpen(false)}
          onSave={() => void saveEditor()}
          onChange={setEditorForm}
        />
      )}
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
  tone: "cyan" | "emerald" | "rose" | "violet" | "amber" | "white";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-200"
      : tone === "rose"
        ? "text-rose-200"
        : tone === "violet"
          ? "text-violet-200"
          : tone === "amber"
            ? "text-amber-200"
            : tone === "cyan"
              ? "text-cyan-200"
              : "text-white";

  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className={`text-[11px] uppercase tracking-[0.2em] ${toneClass}`}>
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
    </div>
  );
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="mr-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>

      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-2xl border px-3 py-2 text-xs transition ${
            value === option.value
              ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
              : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function CacheReplyRow({
  item,
  selected,
  onSelect,
  onEdit,
  onToggle,
  onPromote,
}: {
  item: CacheItem;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onPromote: () => void;
}) {
  const risk = inferCacheRisk(item);
  const quality = scoreCacheQuality(item);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[26px] border p-4 text-left transition ${
        selected
          ? "border-cyan-400/25 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]"
          : "border-white/10 bg-black/20 hover:border-white/15 hover:bg-white/[0.035]"
      }`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-white line-clamp-2">
            {item.question}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] ${providerChipClass(
                item.provider
              )}`}
            >
              {providerLabel(item.provider)}
            </span>

            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] ${statusChipClass(
                Boolean(item.is_blocked)
              )}`}
            >
              {item.is_blocked ? "Paused" : "Reusable"}
            </span>

            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] ${riskChipClass(
                risk
              )}`}
            >
              {riskLabel(risk)}
            </span>

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400">
              Quality {quality}/100
            </span>

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400">
              Used {item.usage_count ?? 0}
            </span>
          </div>

          <div className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
            {item.answer || "No answer saved."}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <RowButton
            icon={Pencil}
            label="Edit"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          />

          <RowButton
            icon={item.is_blocked ? BadgeCheck : Ban}
            label={item.is_blocked ? "Use" : "Pause"}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
          />

          <RowButton
            icon={FileCheck2}
            label="Approve"
            onClick={(event) => {
              event.stopPropagation();
              onPromote();
            }}
          />
        </div>
      </div>
    </button>
  );
}

function CacheGroupRow({
  cluster,
  selected,
  onSelect,
}: {
  cluster: CacheCluster;
  selected: boolean;
  onSelect: () => void;
}) {
  const bestQuality = scoreCacheQuality(cluster.bestItem);
  const duplicateCount = Math.max(0, cluster.items.length - 1);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[26px] border p-4 text-left transition ${
        selected
          ? "border-emerald-400/25 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]"
          : "border-white/10 bg-black/20 hover:border-white/15 hover:bg-white/[0.035]"
      }`}
    >
      <div className="text-base font-semibold text-white line-clamp-2">
        {cluster.bestItem.question}
      </div>

      <div className="mt-2 text-xs text-slate-500 line-clamp-1">
        {cluster.normalized_question}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200">
          Best quality {bestQuality}/100
        </span>

        <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200">
          {cluster.items.length} saved replies
        </span>

        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400">
          Used {cluster.totalUsage}
        </span>

        {duplicateCount > 0 ? (
          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
            {duplicateCount} duplicates
          </span>
        ) : null}

        {cluster.blockedCount > 0 ? (
          <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-300">
            {cluster.blockedCount} paused
          </span>
        ) : null}
      </div>
    </button>
  );
}

function RowButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function CacheReviewPanel({
  selectedItem,
  duplicates,
  similarityRows,
  similarityLoading,
  promoting,
  onRefreshSimilarity,
  onCleanDuplicates,
  onEdit,
  onToggle,
  onPromote,
  onDelete,
}: {
  selectedItem: CacheItem | null;
  duplicates: CacheItem[];
  similarityRows: SimilarityRow[];
  similarityLoading: boolean;
  promoting: boolean;
  onRefreshSimilarity: () => void;
  onCleanDuplicates: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onPromote: () => void;
  onDelete: () => void;
}) {
  if (!selectedItem) {
    return (
      <aside className="min-h-0 overflow-y-auto overscroll-contain rounded-[32px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
        <div className="flex h-full min-h-[520px] items-center justify-center p-6 text-center text-sm text-slate-500">
          Select a saved reply to review it.
        </div>
      </aside>
    );
  }

  const risk = inferCacheRisk(selectedItem);
  const quality = scoreCacheQuality(selectedItem);

    return (
    <aside className="min-h-0 overflow-y-auto overscroll-contain rounded-[32px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-fuchsia-200/90">
          Selected Saved Reply
        </div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
          Review Panel
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Edit, pause, approve, delete, and inspect similar saved replies.
        </p>
      </div>

      <div className="flex flex-col p-4">
        <div className="rounded-[28px] border border-white/10 bg-black/20 p-4">
          <div className="text-lg font-semibold text-white">
            {selectedItem.question}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] ${providerChipClass(
                selectedItem.provider
              )}`}
            >
              {providerLabel(selectedItem.provider)}
            </span>

            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] ${statusChipClass(
                Boolean(selectedItem.is_blocked)
              )}`}
            >
              {selectedItem.is_blocked ? "Paused" : "Reusable"}
            </span>

            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] ${riskChipClass(
                risk
              )}`}
            >
              {riskLabel(risk)}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InsightCard icon={Sparkles} label="Quality" value={`${quality}/100`} />
            <InsightCard icon={ShieldAlert} label="Review Status" value={riskLabel(risk)} />
            <InsightCard
              icon={Database}
              label="Source"
              value={providerLabel(selectedItem.provider)}
            />
            <InsightCard
              icon={Brain}
              label="Times Used"
              value={String(selectedItem.usage_count ?? 0)}
            />
            <InsightCard
              icon={Sparkles}
              label="Stored Score"
              value={String(selectedItem.quality_score ?? 0)}
            />
            <InsightCard
              icon={Database}
              label="Last Used"
              value={formatDateTime(selectedItem.last_used_at)}
            />
          </div>

          {risk !== "healthy" ? (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              This saved reply needs review before it should be approved.
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onEdit} className={buttonNeutralClass}>
              <Pencil className="h-4 w-4" />
              Edit
            </button>

            <button type="button" onClick={onToggle} className={buttonNeutralClass}>
              {selectedItem.is_blocked ? (
                <>
                  <BadgeCheck className="h-4 w-4" />
                  Use Again
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4" />
                  Pause
                </>
              )}
            </button>

            <button type="button" onClick={onPromote} className={buttonNeutralClass}>
              <FileCheck2 className="h-4 w-4" />
              {promoting ? "Approving..." : "Approve"}
            </button>

            <button type="button" onClick={onDelete} className={buttonDangerClass}>
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-[28px] border border-white/10 bg-black/30">
          <div className="border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Answer
          </div>
          <div className="max-h-[280px] overflow-y-auto whitespace-pre-wrap px-4 py-4 text-sm leading-6 text-slate-300">
            {selectedItem.answer || "No answer saved."}
          </div>
        </div>

        <div className="mt-4 rounded-[28px] border border-white/10 bg-black/30">
          <div className="border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Details
          </div>
          <div className="grid gap-3 p-4 text-sm">
            <Field label="Question" value={selectedItem.question} />
            <Field label="Normalized Question" value={selectedItem.normalized_question} />
            <Field
              label="Normalization Check"
              value={
                selectedItem.normalized_question ===
                normalizeQuestion(selectedItem.question)
                  ? "Match"
                  : "Needs cleanup"
              }
            />
            <Field label="Provider" value={selectedItem.provider} />
            <Field label="Model" value={selectedItem.model} />
            <Field label="Created" value={formatDateTime(selectedItem.created_at)} />
            <Field label="Updated" value={formatDateTime(selectedItem.updated_at)} />
          </div>
        </div>

        <SemanticMatchesPanel
          rows={similarityRows}
          loading={similarityLoading}
          onRefresh={onRefreshSimilarity}
        />

        {duplicates.length > 0 ? (
          <div className="mt-4 rounded-[28px] border border-amber-400/20 bg-amber-500/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-amber-200">
                  Duplicate Saved Replies
                </div>
                <div className="mt-1 text-xs text-amber-100/55">
                  {duplicates.length} duplicate repl{duplicates.length === 1 ? "y" : "ies"} found for the same question.
                </div>
              </div>

              <button
                type="button"
                onClick={onCleanDuplicates}
                className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 transition hover:bg-amber-500/20"
              >
                Pause Duplicates
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {duplicates.map((duplicate) => (
                <div
                  key={duplicate.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-2 text-xs text-slate-300"
                >
                  {duplicate.question}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function SemanticMatchesPanel({
  rows,
  loading,
  onRefresh,
}: {
  rows: SimilarityRow[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="mt-4 rounded-[28px] border border-white/10 bg-black/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">
            Similar Saved Replies
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Closest saved replies found by meaning, not exact wording.
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-slate-500">
            Loading similar replies...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-slate-500">
            No similar replies found.
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 truncate text-xs text-slate-300">
                  {row.question}
                </div>

                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-200">
                  {Number(row.similarity).toFixed(3)}
                </span>
              </div>

              <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                {row.answer}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CacheEditorModal({
  form,
  saving,
  onClose,
  onSave,
  onChange,
}: {
  form: CacheEditorState;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (value: CacheEditorState) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[30px] border border-white/10 bg-[#05070f] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-fuchsia-200/90">
              Edit Saved Reply
            </div>
            <h3 className="mt-1 text-xl font-semibold text-white">
              {form.question || "Untitled saved reply"}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <FieldBlock label="Question" className="mt-6">
          <input
            value={form.question}
            onChange={(event) =>
              onChange({
                ...form,
                question: event.target.value,
                normalized_question: normalizeQuestion(event.target.value),
              })
            }
            placeholder="Question the user may ask..."
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400/30"
          />
        </FieldBlock>

        <FieldBlock label="Saved answer" className="mt-4">
          <textarea
            value={form.answer}
            onChange={(event) =>
              onChange({ ...form, answer: event.target.value })
            }
            placeholder="Answer the assistant should reuse..."
            className="h-44 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-400/30"
          />
        </FieldBlock>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FieldBlock label="Source">
            <input
              value={form.provider}
              onChange={(event) =>
                onChange({ ...form, provider: event.target.value })
              }
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400/30"
            />
          </FieldBlock>

          <FieldBlock label="Model">
            <input
              value={form.model}
              onChange={(event) =>
                onChange({ ...form, model: event.target.value })
              }
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400/30"
            />
          </FieldBlock>

          <FieldBlock label="Times used">
            <input
              type="number"
              min={0}
              value={form.usage_count}
              onChange={(event) =>
                onChange({
                  ...form,
                  usage_count: Number(event.target.value),
                })
              }
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400/30"
            />
          </FieldBlock>

          <FieldBlock label="Use status">
            <select
              value={form.is_blocked ? "blocked" : "active"}
              onChange={(event) =>
                onChange({
                  ...form,
                  is_blocked: event.target.value === "blocked",
                })
              }
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400/30"
            >
              <option value="active">Reusable</option>
              <option value="blocked">Paused</option>
            </select>
          </FieldBlock>
        </div>

        <FieldBlock label="Normalized question" className="mt-4">
          <input
            value={form.normalized_question}
            onChange={(event) =>
              onChange({ ...form, normalized_question: event.target.value })
            }
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400/30"
          />
        </FieldBlock>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonNeutralClass}>
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className={buttonPrimaryClass}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-2 text-sm text-white">{value}</div>
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
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={`mt-1 text-slate-300 ${
          multiline ? "whitespace-pre-wrap" : ""
        }`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function FieldBlock({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      {children}
    </label>
  );
}
