import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Eye,
  ExternalLink,
  FileCode2,
  FileText,
  Github,
  PauseCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type KnowledgeSource = "github" | "manual" | "upload";
type KnowledgeStatus = "active" | "draft" | "inactive" | "archived";

type KnowledgeItem = {
  id: string;
  title: string;
  slug: string | null;
  category: string | null;
  source_type: KnowledgeSource;
  status: KnowledgeStatus;
  content: string | null;
  extracted_text: string | null;
  source_path: string | null;
  source_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  is_active: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

type GithubKnowledgeItem = {
  name: string;
  path: string;
  sha: string;
  size: number;
  download_url: string | null;
  html_url: string | null;
  type: "file";
  category: string;
  title: string;
  source_type: "github";
  status: KnowledgeStatus;
  is_active: boolean;
  updated_at: string | null;
  content?: string | null;
};

type UnifiedKnowledgeItem = KnowledgeItem & {
  origin: "database" | "github";
  github_path?: string | null;
  github_sha?: string | null;
  html_url?: string | null;
};

type EditorMode = "create" | "edit";

type EditorFormState = {
  title: string;
  category: string;
  source_type: KnowledgeSource;
  status: KnowledgeStatus;
  content: string;
  source_path: string;
  source_url: string;
  file_name: string;
  file_type: string;
  admin_notes: string;
  is_active: boolean;
};

const EMPTY_FORM: EditorFormState = {
  title: "",
  category: "",
  source_type: "github",
  status: "draft",
  content: "",
  source_path: "",
  source_url: "",
  file_name: "",
  file_type: "",
  admin_notes: "",
  is_active: true,
};

function formatKnowledgeDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSourceLabel(source: KnowledgeSource) {
  if (source === "github") return "Main file";
  if (source === "upload") return "Imported file";
  return "Manual note";
}

function getStatusLabel(item: Pick<KnowledgeItem, "status" | "is_active">) {
  if (item.is_active && item.status === "active") return "Active for AI";
  if (item.status === "draft") return "Draft";
  if (item.status === "archived") return "Archived";
  return "Paused";
}

function sourceIcon(source: KnowledgeSource) {
  if (source === "github") return Github;
  if (source === "upload") return Upload;
  return FileText;
}

function sourceChipClass(source: KnowledgeSource) {
  if (source === "github") {
    return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
  }

  if (source === "upload") {
    return "border-violet-400/20 bg-violet-500/10 text-violet-200";
  }

  return "border-amber-400/20 bg-amber-500/10 text-amber-200";
}

function statusChipClass(status: KnowledgeStatus, isActive: boolean) {
  if (isActive && status === "active") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "draft") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-300";
  }

  if (status === "archived") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-300";
  }

  return "border-white/10 bg-white/[0.05] text-white/55";
}

function normalizeGithubItem(item: GithubKnowledgeItem): UnifiedKnowledgeItem {
  return {
    id: `github:${item.path}`,
    title: item.title,
    slug: null,
    category: item.category ?? "general",
    source_type: "github",
    status: item.status,
    content: item.content ?? null,
    extracted_text: item.content ?? null,
    source_path: item.path,
    source_url: item.download_url ?? item.html_url ?? null,
    file_name: item.name,
    file_type: "markdown",
    file_size_bytes: item.size ?? null,
    is_active: item.is_active,
    admin_notes: "Synced knowledge file",
    created_at: "",
    updated_at: item.updated_at ?? "",
    origin: "github",
    github_path: item.path,
    github_sha: item.sha,
    html_url: item.html_url ?? null,
  };
}

function toEditorForm(item: KnowledgeItem): EditorFormState {
  return {
    title: item.title ?? "",
    category: item.category ?? "",
    source_type: item.source_type,
    status: item.status,
    content: item.content ?? item.extracted_text ?? "",
    source_path: item.source_path ?? "",
    source_url: item.source_url ?? "",
    file_name: item.file_name ?? "",
    file_type: item.file_type ?? "",
    admin_notes: item.admin_notes ?? "",
    is_active: item.is_active,
  };
}

export default function AIKnowledgeBankPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [dbItems, setDbItems] = useState<KnowledgeItem[]>([]);
  const [githubItems, setGithubItems] = useState<UnifiedKnowledgeItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingGithubContent, setLoadingGithubContent] = useState(false);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | KnowledgeSource>(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | KnowledgeStatus
  >("all");

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editorForm, setEditorForm] = useState<EditorFormState>(EMPTY_FORM);

  const [pageError, setPageError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  function getFunctionsBaseUrl() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    return `${supabaseUrl}/functions/v1`;
  }

  async function callGithubKnowledgeApi(path: string, init?: RequestInit) {
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;

    const response = await fetch(
      `${getFunctionsBaseUrl()}/ai-knowledge-github${path}`,
      {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(init?.headers ?? {}),
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.success === false) {
      throw new Error(data?.error || "Knowledge request failed.");
    }

    return data;
  }

  async function loadKnowledgeItems(showRefreshing = false) {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setPageError(null);

    try {
      const [dbResult, githubResult] = await Promise.all([
        supabase
          .from("ai_knowledge_items")
          .select("*")
          .order("updated_at", { ascending: false }),
        callGithubKnowledgeApi(""),
      ]);

      const { data, error } = dbResult;

      if (error) {
        throw new Error(error.message);
      }

      const nextDbItems = (data ?? []) as KnowledgeItem[];
      const nextGithubItems = Array.isArray(githubResult?.items)
        ? (githubResult.items as GithubKnowledgeItem[]).map(normalizeGithubItem)
        : [];

          setDbItems(nextDbItems);
      setGithubItems(nextGithubItems);

      const merged = [
        ...nextGithubItems,
        ...nextDbItems.map((item) => ({
          ...item,
          origin: "database" as const,
          github_path: null,
          github_sha: null,
          html_url: null,
        })),
      ];

      if (!selectedItemId && merged.length > 0) {
        setSelectedItemId(merged[0].id);
      }

      if (selectedItemId && merged.every((item) => item.id !== selectedItemId)) {
        setSelectedItemId(merged[0]?.id ?? null);
      }
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Could not load knowledge."
      );
      setDbItems([]);
      setGithubItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadKnowledgeItems();
  }, []);

  const items = useMemo<UnifiedKnowledgeItem[]>(() => {
    return [
      ...githubItems,
      ...dbItems.map((item) => ({
        ...item,
        origin: "database" as const,
        github_path: null,
        github_sha: null,
        html_url: null,
      })),
    ];
  }, [dbItems, githubItems]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        (item.category ?? "").toLowerCase().includes(query) ||
        (item.file_name ?? "").toLowerCase().includes(query) ||
        (item.source_path ?? "").toLowerCase().includes(query);

      const matchesSource =
        sourceFilter === "all" ? true : item.source_type === sourceFilter;

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? item.is_active === true
            : statusFilter === "inactive"
              ? item.is_active === false
              : item.status === statusFilter;

      return matchesSearch && matchesSource && matchesStatus;
    });
  }, [items, search, sourceFilter, statusFilter]);

  const selectedItem =
    items.find((item) => item.id === selectedItemId) ?? filteredItems[0] ?? null;

  useEffect(() => {
    if (!selectedItem) return;
    void loadSelectedGithubContent(selectedItem);
  }, [selectedItem?.id]);

  const summary = useMemo(() => {
    const mainFiles = items.filter((item) => item.source_type === "github").length;
    const manualNotes = items.filter((item) => item.source_type === "manual").length;
    const importedFiles = items.filter((item) => item.source_type === "upload").length;
    const activeForAi = items.filter((item) => item.is_active).length;

    return {
      total: items.length,
      mainFiles,
      manualNotes,
      importedFiles,
      activeForAi,
    };
  }, [items]);

  function resetEditor() {
    setEditorMode("create");
    setEditingItemId(null);
    setEditorForm(EMPTY_FORM);
  }

  function openCreateEditor() {
    resetEditor();
    setEditorOpen(true);
    setActionMessage(null);
    setPageError(null);
  }

  function openEditEditor(item: KnowledgeItem) {
    setEditorMode("edit");
    setEditingItemId(item.id);
    setEditorForm(toEditorForm(item));
    setEditorOpen(true);
    setActionMessage(null);
    setPageError(null);
  }

  async function saveEditor() {
    if (!editorForm.title.trim()) {
      setPageError("Please add a title.");
      return;
    }

    if (!editorForm.content.trim()) {
      setPageError("Please add the knowledge content.");
      return;
    }

    setSaving(true);
    setPageError(null);
    setActionMessage(null);

    try {
      if (editorMode === "create") {
        if (editorForm.source_type === "github") {
          await callGithubKnowledgeApi("", {
            method: "POST",
            body: JSON.stringify({
              title: editorForm.title.trim(),
              category: editorForm.category.trim() || "general",
              content: editorForm.content.trim(),
              status: editorForm.status,
            }),
          });

          setActionMessage("Knowledge added.");
        } else {
          const payload = {
            title: editorForm.title.trim(),
            category: editorForm.category.trim() || null,
            source_type: editorForm.source_type,
            status: editorForm.status,
            content: editorForm.content.trim() || null,
            extracted_text: editorForm.content.trim() || null,
            source_path: editorForm.source_path.trim() || null,
            source_url: editorForm.source_url.trim() || null,
            file_name: editorForm.file_name.trim() || null,
            file_type: editorForm.file_type.trim() || null,
            admin_notes: editorForm.admin_notes.trim() || null,
            is_active: editorForm.is_active,
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase.from("ai_knowledge_items").insert(payload);

          if (error) {
            throw new Error(error.message);
          }

          await supabase.from("ai_admin_activity_logs").insert({
            action_type: "knowledge_created",
            entity_type: "knowledge",
            entity_id: null,
            details: {
              title: editorForm.title,
              source_type: editorForm.source_type,
              status: editorForm.status,
            },
          });

          setActionMessage("Knowledge added.");
        }
      } else {
        if (selectedItem?.origin === "github" && selectedItem.github_path) {
          await callGithubKnowledgeApi("", {
            method: "PUT",
            body: JSON.stringify({
              path: selectedItem.github_path,
              title: editorForm.title.trim(),
              category: editorForm.category.trim() || "general",
              content: editorForm.content.trim(),
              status: editorForm.status,
            }),
          });

          setActionMessage("Knowledge updated.");
        } else {
          const payload = {
            title: editorForm.title.trim(),
            category: editorForm.category.trim() || null,
            source_type: editorForm.source_type,
            status: editorForm.status,
            content: editorForm.content.trim() || null,
            extracted_text: editorForm.content.trim() || null,
            source_path: editorForm.source_path.trim() || null,
            source_url: editorForm.source_url.trim() || null,
            file_name: editorForm.file_name.trim() || null,
            file_type: editorForm.file_type.trim() || null,
            admin_notes: editorForm.admin_notes.trim() || null,
            is_active: editorForm.is_active,
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase
            .from("ai_knowledge_items")
            .update(payload)
            .eq("id", editingItemId);

          if (error) {
            throw new Error(error.message);
          }

          await supabase.from("ai_admin_activity_logs").insert({
            action_type: "knowledge_updated",
            entity_type: "knowledge",
            entity_id: editingItemId ?? null,
            details: {
              title: editorForm.title,
              source_type: editorForm.source_type,
              status: editorForm.status,
            },
          });

          setActionMessage("Knowledge updated.");
        }
      }

      setEditorOpen(false);
      resetEditor();
      await loadKnowledgeItems(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not save knowledge.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleItemActive(item: KnowledgeItem) {
    setPageError(null);
    setActionMessage(null);

    const nextIsActive = !item.is_active;
    const nextStatus: KnowledgeStatus = nextIsActive ? "active" : "inactive";

    const { error } = await supabase
      .from("ai_knowledge_items")
      .update({
        is_active: nextIsActive,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      setPageError(error.message);
      return;
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "knowledge_toggled",
      entity_type: "knowledge",
      entity_id: item.id,
      details: {
        is_active: nextIsActive,
      },
    });

    setActionMessage(
      nextIsActive ? "Knowledge is now active for the assistant." : "Knowledge is now paused."
    );

    await loadKnowledgeItems(true);
  }

  async function archiveItem(item: KnowledgeItem) {
    setPageError(null);
    setActionMessage(null);

    const { error } = await supabase
      .from("ai_knowledge_items")
      .update({
        status: "archived",
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      setPageError(error.message);
      return;
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "knowledge_archived",
      entity_type: "knowledge",
      entity_id: item.id,
      details: {
        status: "archived",
      },
    });

    setActionMessage("Knowledge archived.");
    await loadKnowledgeItems(true);
  }

  async function deleteItem(item: UnifiedKnowledgeItem) {
    const confirmed = window.confirm(
      `Delete "${item.title}" permanently from the Knowledge Bank?`
    );

    if (!confirmed) return;

    setPageError(null);
    setActionMessage(null);

    try {
      if (item.origin === "github" && item.github_path) {
        await callGithubKnowledgeApi("", {
          method: "DELETE",
          body: JSON.stringify({
            path: item.github_path,
          }),
        });
      } else {
        const { error } = await supabase
          .from("ai_knowledge_items")
          .delete()
          .eq("id", item.id);

        if (error) {
          throw new Error(error.message);
        }
      }

      if (selectedItemId === item.id) {
        setSelectedItemId(null);
      }

      await supabase.from("ai_admin_activity_logs").insert({
        action_type: "knowledge_deleted",
        entity_type: "knowledge",
        entity_id: item.id,
        details: {
          title: item.title,
        },
      });

      setActionMessage("Knowledge deleted.");
      await loadKnowledgeItems(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not delete knowledge.");
    }
  }

  async function handleUploadInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPageError(null);
    setActionMessage(null);

    try {
      const text = await file.text();

      await callGithubKnowledgeApi("", {
        method: "POST",
        body: JSON.stringify({
          title: file.name.replace(/\.[^/.]+$/, ""),
          category: "imported",
          content: text,
          status: "draft",
        }),
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await supabase.from("ai_admin_activity_logs").insert({
        action_type: "knowledge_imported",
        entity_type: "knowledge",
        entity_id: null,
        details: {
          file_name: file.name,
        },
      });

      setActionMessage("File imported into the Knowledge Bank.");
      await loadKnowledgeItems(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not import file.");
    }
  }

  function openSelectedInEditor() {
    if (!selectedItem) return;
    openEditEditor(selectedItem);
  }

  async function loadSelectedGithubContent(item: UnifiedKnowledgeItem) {
    if (item.origin !== "github" || !item.github_path) return;
    if (item.content || item.extracted_text) return;

    setLoadingGithubContent(true);
    setPageError(null);

    try {
      const result = await callGithubKnowledgeApi(
        `?path=${encodeURIComponent(item.github_path)}`
      );

      const content = String(result?.item?.content ?? result?.content ?? "").trim();

      if (!content) {
        setPageError("The selected file has no content to preview.");
        return;
      }

      setGithubItems((current) =>
        current.map((githubItem) =>
          githubItem.id === item.id
            ? {
                ...githubItem,
                content,
                extracted_text: content,
              }
            : githubItem
        )
      );
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Could not load file content."
      );
    } finally {
      setLoadingGithubContent(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-6 py-6 text-white">
      <div className="mx-auto grid w-full max-w-[1600px] gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-6">
            <button
              type="button"
              onClick={() => navigate("/ai-management")}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
            >
              <ArrowLeft className="h-4 w-4" />
              AI Studio
            </button>

            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Database className="h-3.5 w-3.5" />
                  Assistant Knowledge
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                    Knowledge Bank
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Control the information the AiXia assistant can use. Add knowledge,
                    import files, review content, and decide what is active for the AI.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void loadKnowledgeItems(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={openCreateEditor}
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  <Plus className="h-4 w-4" />
                  Add Knowledge
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  <Upload className="h-4 w-4" />
                  Import File
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.json,.csv"
                  className="hidden"
                  onChange={handleUploadInputChange}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <SummaryCard
                label="Total Knowledge"
                value={String(summary.total)}
                helper="Everything in this bank"
                tone="cyan"
              />
              <SummaryCard
                label="Active for AI"
                value={String(summary.activeForAi)}
                helper="Used by assistant now"
                tone="emerald"
              />
              <SummaryCard
                label="Main Files"
                value={String(summary.mainFiles)}
                helper="Synced knowledge files"
                tone="cyan"
              />
              <SummaryCard
                label="Manual Notes"
                value={String(summary.manualNotes)}
                helper="Written inside AiXia"
                tone="amber"
              />
              <SummaryCard
                label="Imported Files"
                value={String(summary.importedFiles)}
                helper="Added from files"
                tone="violet"
              />
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
                  placeholder="Search knowledge..."
                  className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30"
                />
              </div>

              <div className="flex flex-col gap-3 xl:items-end">
                <FilterGroup
                  label="Type"
                  value={sourceFilter}
                  options={[
                    { value: "all", label: "All" },
                    { value: "github", label: "Main Files" },
                    { value: "manual", label: "Manual Notes" },
                    { value: "upload", label: "Imported Files" },
                  ]}
                  onChange={(value) =>
                    setSourceFilter(value as "all" | KnowledgeSource)
                  }
                />

                <FilterGroup
                  label="Use"
                  value={statusFilter}
                  options={[
                    { value: "all", label: "All" },
                    { value: "active", label: "Active for AI" },
                    { value: "draft", label: "Draft" },
                    { value: "inactive", label: "Paused" },
                    { value: "archived", label: "Archived" },
                  ]}
                  onChange={(value) =>
                    setStatusFilter(value as "all" | KnowledgeStatus)
                  }
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
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
                  Nothing found
                </div>

                <div className="mt-2 text-sm text-slate-500">
                  Try another search or add new knowledge.
                </div>

                <button
                  type="button"
                  onClick={openCreateEditor}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  <Plus className="h-4 w-4" />
                  Add Knowledge
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredItems.map((item) => (
                  <KnowledgeRow
                    key={item.id}
                    item={item}
                    selected={selectedItem?.id === item.id}
                    onSelect={() => setSelectedItemId(item.id)}
                    onEdit={() => openEditEditor(item)}
                    onToggle={() => void toggleItemActive(item)}
                    onArchive={() => void archiveItem(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <KnowledgeReviewPanel
          selectedItem={selectedItem}
          loadingGithubContent={loadingGithubContent}
          onEdit={openSelectedInEditor}
          onToggle={() => {
            if (selectedItem) void toggleItemActive(selectedItem);
          }}
          onArchive={() => {
            if (selectedItem) void archiveItem(selectedItem);
          }}
          onDelete={() => {
            if (selectedItem) void deleteItem(selectedItem);
          }}
        />
      </div>

      {editorOpen && (
        <KnowledgeEditorModal
          mode={editorMode}
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
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: "cyan" | "emerald" | "amber" | "violet";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-200"
      : tone === "amber"
        ? "text-amber-200"
        : tone === "violet"
          ? "text-violet-200"
          : "text-cyan-200";

  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className={`text-[11px] uppercase tracking-[0.22em] ${toneClass}`}>
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{helper}</div>
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

function KnowledgeRow({
  item,
  selected,
  onSelect,
  onEdit,
  onToggle,
  onArchive,
}: {
  item: UnifiedKnowledgeItem;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onArchive: () => void;
}) {
  const SourceIcon = sourceIcon(item.source_type);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[26px] border p-4 text-left transition ${
        selected
          ? "border-cyan-400/25 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]"
          : item.origin === "github"
            ? "border-cyan-400/10 bg-cyan-500/[0.035] hover:border-cyan-400/20 hover:bg-cyan-500/[0.06]"
            : "border-white/10 bg-black/20 hover:border-white/15 hover:bg-white/[0.035]"
      }`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-semibold text-white">
              {item.title}
            </div>

            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${sourceChipClass(
                item.source_type
              )}`}
            >
              <SourceIcon className="h-3.5 w-3.5" />
              {getSourceLabel(item.source_type)}
            </span>

            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] ${statusChipClass(
                item.status,
                item.is_active
              )}`}
            >
              {getStatusLabel(item)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
            <span>{item.category || "general"}</span>
            <span>{item.file_type || item.source_type}</span>
            <span>{formatFileSize(item.file_size_bytes)}</span>
            <span>Updated {formatKnowledgeDate(item.updated_at)}</span>
          </div>

          <div className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
            {item.extracted_text ||
              item.content ||
              item.source_path ||
              "No content available yet."}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            <Eye className="h-3.5 w-3.5" />
            Review
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>

          {item.origin === "github" && item.html_url ? (
            <a
              href={item.html_url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 transition hover:bg-cyan-500/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open File
            </a>
          ) : null}

          {item.origin !== "github" ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle();
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                {item.is_active ? "Pause" : "Use"}
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onArchive();
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                Archive
              </button>
            </>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function KnowledgeReviewPanel({
  selectedItem,
  loadingGithubContent,
  onEdit,
  onToggle,
  onArchive,
  onDelete,
}: {
  selectedItem: UnifiedKnowledgeItem | null;
  loadingGithubContent: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  if (!selectedItem) {
    return (
      <aside className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
        <div className="flex h-full min-h-[520px] items-center justify-center p-6 text-center text-sm text-slate-500">
          Select knowledge to review what the assistant can use.
        </div>
      </aside>
    );
  }

  const SourceIcon =
    selectedItem.source_type === "github"
      ? Github
      : selectedItem.source_type === "upload"
        ? FileCode2
        : FileText;

  return (
    <aside className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/90">
          Selected Knowledge
        </div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
          Review Panel
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Review this item and choose whether the assistant can use it.
        </p>
      </div>

      <div className="flex flex-col p-4">
        <div className="rounded-[28px] border border-white/10 bg-black/20 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300">
              <SourceIcon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold text-white">
                {selectedItem.title}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {selectedItem.category || "general"}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] ${sourceChipClass(
                selectedItem.source_type
              )}`}
            >
              {getSourceLabel(selectedItem.source_type)}
            </span>

            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] ${statusChipClass(
                selectedItem.status,
                selectedItem.is_active
              )}`}
            >
              {getStatusLabel(selectedItem)}
            </span>

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-500">
              {selectedItem.file_type || "text"}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <InfoTile label="Updated" value={formatKnowledgeDate(selectedItem.updated_at)} />
            <InfoTile label="Size" value={formatFileSize(selectedItem.file_size_bytes)} />

            {selectedItem.origin === "github" && selectedItem.github_path ? (
              <InfoTile label="File path" value={selectedItem.github_path} />
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>

            {selectedItem.origin === "github" && selectedItem.html_url ? (
              <a
                href={selectedItem.html_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 transition hover:bg-cyan-500/20"
              >
                <ExternalLink className="h-4 w-4" />
                Open File
              </a>
            ) : null}

            {selectedItem.origin !== "github" ? (
              <>
                <button
                  type="button"
                  onClick={onToggle}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  {selectedItem.is_active ? (
                    <PauseCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {selectedItem.is_active ? "Pause" : "Use for AI"}
                </button>

                <button
                  type="button"
                  onClick={onArchive}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Archive
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 transition hover:bg-rose-500/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        <div className="mt-4 h-[420px] overflow-hidden rounded-[28px] border border-white/10 bg-black/30">
          <div className="border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Knowledge Content
          </div>

          <div className="h-[calc(100%-41px)] overflow-y-auto whitespace-pre-wrap px-4 py-4 text-sm leading-6 text-slate-300 overscroll-contain">
            {loadingGithubContent
              ? "Loading file content..."
              : selectedItem.content ||
                selectedItem.extracted_text ||
                "No content available."}
          </div>
        </div>
      </div>
    </aside>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-600">
        {label}
      </div>
      <div className="mt-1 break-words text-sm text-slate-300">{value}</div>
    </div>
  );
}

function KnowledgeEditorModal({
  mode,
  form,
  saving,
  onClose,
  onSave,
  onChange,
}: {
  mode: EditorMode;
  form: EditorFormState;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (value: EditorFormState) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[30px] border border-white/10 bg-[#05070f] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/90">
              {mode === "create" ? "Add Knowledge" : "Edit Knowledge"}
            </div>
            <h3 className="mt-1 text-xl font-semibold text-white">
              {form.title || "Untitled"}
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

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FieldBlock label="Title">
            <input
              value={form.title}
              onChange={(event) =>
                onChange({ ...form, title: event.target.value })
              }
              placeholder="Example: Invoice payment rules"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400/30"
            />
          </FieldBlock>

          <FieldBlock label="Group">
            <input
              value={form.category}
              onChange={(event) =>
                onChange({ ...form, category: event.target.value })
              }
              placeholder="Example: finance"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400/30"
            />
          </FieldBlock>

          <FieldBlock label="Where to save it">
            <select
              value={form.source_type}
              onChange={(event) =>
                onChange({
                  ...form,
                  source_type: event.target.value as KnowledgeSource,
                })
              }
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400/30"
            >
              <option value="github">Main file</option>
              <option value="manual">Manual note</option>
              <option value="upload">Imported file</option>
            </select>
          </FieldBlock>

          <FieldBlock label="Use status">
            <select
              value={form.status}
              onChange={(event) => {
                const nextStatus = event.target.value as KnowledgeStatus;

                onChange({
                  ...form,
                  status: nextStatus,
                  is_active: nextStatus === "active",
                });
              }}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400/30"
            >
              <option value="draft">Draft</option>
              <option value="active">Active for AI</option>
              <option value="inactive">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </FieldBlock>
        </div>

        <FieldBlock label="Knowledge content" className="mt-4">
          <textarea
            value={form.content}
            onChange={(event) =>
              onChange({ ...form, content: event.target.value })
            }
            placeholder="Write the information the assistant is allowed to use..."
            className="h-44 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-400/30"
          />
        </FieldBlock>

        <FieldBlock label="Internal notes" className="mt-4">
          <textarea
            value={form.admin_notes}
            onChange={(event) =>
              onChange({ ...form, admin_notes: event.target.value })
            }
            placeholder="Optional internal note for admins..."
            className="h-20 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-400/30"
          />
        </FieldBlock>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Knowledge"}
          </button>
        </div>
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
