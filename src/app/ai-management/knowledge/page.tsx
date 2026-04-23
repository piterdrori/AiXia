import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Database,
  Eye,
  FileCode2,
  FileText,
  Github,
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
  source_type: "manual",
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

  return "border-white/10 bg-white/[0.05] text-white/45";
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<
    "all" | KnowledgeSource
  >("all");
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

  async function loadKnowledgeItems(showRefreshing = false) {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setPageError(null);

    const { data, error } = await supabase
      .from("ai_knowledge_items")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      setPageError(error.message);
      setItems([]);
    } else {
      const nextItems = (data ?? []) as KnowledgeItem[];
      setItems(nextItems);

      if (!selectedItemId && nextItems.length > 0) {
        setSelectedItemId(nextItems[0].id);
      }

      if (
        selectedItemId &&
        nextItems.every((item) => item.id !== selectedItemId)
      ) {
        setSelectedItemId(nextItems[0]?.id ?? null);
      }
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    void loadKnowledgeItems();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        (item.category ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (item.file_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (item.source_path ?? "").toLowerCase().includes(search.toLowerCase());

      const matchesSource =
        sourceFilter === "all" ? true : item.source_type === sourceFilter;

      const matchesStatus =
        statusFilter === "all" ? true : item.status === statusFilter;

      return matchesSearch && matchesSource && matchesStatus;
    });
  }, [items, search, sourceFilter, statusFilter]);

  const selectedItem =
    items.find((item) => item.id === selectedItemId) ?? filteredItems[0] ?? null;

  const summary = useMemo(() => {
    const githubCount = items.filter((item) => item.source_type === "github").length;
    const manualCount = items.filter((item) => item.source_type === "manual").length;
    const uploadCount = items.filter((item) => item.source_type === "upload").length;
    const activeCount = items.filter(
      (item) => item.status === "active" && item.is_active
    ).length;

    return {
      total: items.length,
      github: githubCount,
      manual: manualCount,
      uploads: uploadCount,
      active: activeCount,
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
  }

  function openEditEditor(item: KnowledgeItem) {
    setEditorMode("edit");
    setEditingItemId(item.id);
    setEditorForm(toEditorForm(item));
    setEditorOpen(true);
    setActionMessage(null);
  }

  async function saveEditor() {
    if (!editorForm.title.trim()) {
      setPageError("Title is required.");
      return;
    }

    setSaving(true);
    setPageError(null);
    setActionMessage(null);

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

    if (editorMode === "create") {
      const { error } = await supabase.from("ai_knowledge_items").insert(payload);

      if (error) {
        setPageError(error.message);
        setSaving(false);
        return;
      }

      setActionMessage("Knowledge item created.");
    } else {
      const { error } = await supabase
        .from("ai_knowledge_items")
        .update(payload)
        .eq("id", editingItemId);

      if (error) {
        setPageError(error.message);
        setSaving(false);
        return;
      }

      setActionMessage("Knowledge item updated.");
    }

    setEditorOpen(false);
    resetEditor();
    await loadKnowledgeItems(true);
    setSaving(false);
  }

  async function toggleItemActive(item: KnowledgeItem) {
    setPageError(null);
    setActionMessage(null);

    const nextIsActive = !item.is_active;
    const nextStatus: KnowledgeStatus = nextIsActive
      ? item.status === "archived"
        ? "active"
        : item.status
      : "inactive";

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

    setActionMessage(
      nextIsActive ? "Knowledge item activated." : "Knowledge item deactivated."
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

    setActionMessage("Knowledge item archived.");
    await loadKnowledgeItems(true);
  }

  async function deleteItem(item: KnowledgeItem) {
    const confirmed = window.confirm(
      `Delete "${item.title}" permanently from AI knowledge?`
    );

    if (!confirmed) return;

    setPageError(null);
    setActionMessage(null);

    const { error } = await supabase
      .from("ai_knowledge_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      setPageError(error.message);
      return;
    }

    if (selectedItemId === item.id) {
      setSelectedItemId(null);
    }

    setActionMessage("Knowledge item deleted.");
    await loadKnowledgeItems(true);
  }

  async function handleUploadInputChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text().catch(() => "");
    setPageError(null);
    setActionMessage(null);

    const payload = {
      title: file.name.replace(/\.[^/.]+$/, ""),
      category: "upload",
      source_type: "upload" as const,
      status: "draft" as const,
      content: text || null,
      extracted_text: text || null,
      source_path: null,
      source_url: null,
      file_name: file.name,
      file_type: file.type || "text/plain",
      file_size_bytes: file.size,
      admin_notes: "Uploaded from AI Knowledge Bank",
      is_active: false,
    };

    const { error } = await supabase.from("ai_knowledge_items").insert(payload);

    if (error) {
      setPageError(error.message);
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setActionMessage("File uploaded into knowledge bank.");
    await loadKnowledgeItems(true);
  }

  function openSelectedInEditor() {
    if (!selectedItem) return;
    openEditEditor(selectedItem);
  }

  return (
    <div className="grid min-h-[calc(100vh-165px)] gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
                Knowledge Bank
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-white">
                AI Knowledge System
              </h1>

              <p className="max-w-3xl text-sm leading-6 text-white/60">
                Manage GitHub knowledge, manual knowledge items, uploaded files,
                activation state, and editing workflows from one control surface.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => void loadKnowledgeItems(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/75 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <button
                onClick={openCreateEditor}
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition-all duration-300 hover:bg-cyan-400"
              >
                <Plus className="h-4 w-4" />
                New Knowledge
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/80 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08]"
              >
                <Upload className="h-4 w-4" />
                Upload File
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

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">
                Total Records
              </div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {summary.total}
              </div>
              <div className="mt-1 text-sm text-white/45">
                Full knowledge inventory
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/80">
                Active Live
              </div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {summary.active}
              </div>
              <div className="mt-1 text-sm text-white/45">
                Feeding current AI context
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-violet-200/80">
                Uploaded Files
              </div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {summary.uploads}
              </div>
              <div className="mt-1 text-sm text-white/45">
                Local knowledge assets
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-200/80">
                GitHub Sources
              </div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {summary.github}
              </div>
              <div className="mt-1 text-sm text-white/45">
                Repo-backed knowledge
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100%-253px)] min-h-0 flex-col">
          <div className="border-b border-white/10 px-6 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-[360px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search knowledge title, category, file, or path..."
                  className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-white/30 focus:border-cyan-400/20"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(["all", "github", "manual", "upload"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setSourceFilter(value)}
                    className={`rounded-2xl border px-3 py-2 text-xs transition-all duration-300 ${
                      sourceFilter === value
                        ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                        : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white/80"
                    }`}
                  >
                    {value === "all"
                      ? "All Sources"
                      : value === "upload"
                      ? "Uploads"
                      : value === "manual"
                      ? "Manual"
                      : "GitHub"}
                  </button>
                ))}

                {(["all", "active", "draft", "inactive", "archived"] as const).map(
                  (value) => (
                    <button
                      key={value}
                      onClick={() => setStatusFilter(value)}
                      className={`rounded-2xl border px-3 py-2 text-xs transition-all duration-300 ${
                        statusFilter === value
                          ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                          : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white/80"
                      }`}
                    >
                      {value === "all"
                        ? "All Status"
                        : value.charAt(0).toUpperCase() + value.slice(1)}
                    </button>
                  )
                )}
              </div>
            </div>

            {(pageError || actionMessage) && (
              <div className="mt-4 space-y-2">
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
          </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 overscroll-contain">
            {loading ? (
              <div className="grid gap-3">
                {[1, 2, 3, 4].map((row) => (
                  <div
                    key={row}
                    className="h-20 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.03]"
                  />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/50">
                  <Database className="h-6 w-6" />
                </div>

                <div className="mt-4 text-lg font-medium text-white">
                  No knowledge found
                </div>

                <div className="mt-2 text-sm text-white/45">
                  Try another search or create a new knowledge item.
                </div>

                <button
                  onClick={openCreateEditor}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition-all duration-300 hover:bg-cyan-400"
                >
                  <Plus className="h-4 w-4" />
                  Create knowledge
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => {
                  const SourceIcon = sourceIcon(item.source_type);
                  const isSelected = selectedItem?.id === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`w-full rounded-[26px] border p-4 text-left transition-all duration-300 ${
                        isSelected
                          ? "border-cyan-400/20 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]"
                          : "border-white/10 bg-black/20 hover:border-white/15 hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-medium text-white">
                              {item.title}
                            </div>

                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${sourceChipClass(
                                item.source_type
                              )}`}
                            >
                              <SourceIcon className="h-3.5 w-3.5" />
                              {item.source_type}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] ${statusChipClass(
                                item.status,
                                item.is_active
                              )}`}
                            >
                              {item.status}
                              {item.is_active ? " • live" : ""}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/40">
                            <span>Category: {item.category || "general"}</span>
                            <span>
                              Type: {item.file_type || item.source_type}
                            </span>
                            <span>
                              Size: {formatFileSize(item.file_size_bytes)}
                            </span>
                            <span>
                              Updated: {formatKnowledgeDate(item.updated_at)}
                            </span>
                          </div>

                          <div className="mt-3 line-clamp-2 text-sm leading-6 text-white/55">
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
                              setSelectedItemId(item.id);
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition-all duration-300 hover:bg-white/[0.08] hover:text-white"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Preview
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditEditor(item);
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition-all duration-300 hover:bg-white/[0.08] hover:text-white"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void toggleItemActive(item);
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition-all duration-300 hover:bg-white/[0.08] hover:text-white"
                          >
                            {item.is_active ? "Deactivate" : "Activate"}
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void archiveItem(item);
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition-all duration-300 hover:bg-white/[0.08] hover:text-white"
                          >
                            Archive
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/90">
                Knowledge Preview
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Working Inspector
              </h2>
              <p className="text-sm text-white/50">
                Preview, edit, activate, archive, and manage live knowledge.
              </p>
            </div>

            {selectedItem && (
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
                {selectedItem.source_type}
              </div>
            )}
          </div>
        </div>

        <div className="flex h-[calc(100%-96px)] min-h-0 flex-col p-4">
          {!selectedItem ? (
            <div className="flex h-full items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-white/45">
              Select a knowledge item to inspect its content and actions.
            </div>
          ) : (
            <>
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70">
                    {selectedItem.source_type === "github" ? (
                      <Github className="h-5 w-5" />
                    ) : selectedItem.source_type === "upload" ? (
                      <FileCode2 className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-semibold text-white">
                      {selectedItem.title}
                    </div>
                    <div className="mt-1 text-sm text-white/45">
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
                    {selectedItem.source_type}
                  </span>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${statusChipClass(
                      selectedItem.status,
                      selectedItem.is_active
                    )}`}
                  >
                    {selectedItem.status}
                    {selectedItem.is_active ? " • live" : ""}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/45">
                    {selectedItem.file_type || "text"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                      Updated
                    </div>
                    <div className="mt-1 text-sm text-white/75">
                      {formatKnowledgeDate(selectedItem.updated_at)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                      File Size
                    </div>
                    <div className="mt-1 text-sm text-white/75">
                      {formatFileSize(selectedItem.file_size_bytes)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={openSelectedInEditor}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/75 transition-all duration-300 hover:bg-white/[0.08] hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>

                  <button
                    onClick={() => void toggleItemActive(selectedItem)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/75 transition-all duration-300 hover:bg-white/[0.08] hover:text-white"
                  >
                    {selectedItem.is_active ? "Deactivate" : "Activate"}
                  </button>

                  <button
                    onClick={() => void archiveItem(selectedItem)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/75 transition-all duration-300 hover:bg-white/[0.08] hover:text-white"
                  >
                    Archive
                  </button>

                  <button
                    onClick={() => void deleteItem(selectedItem)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 transition-all duration-300 hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>

                            <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-black/30">
                <div className="border-b border-white/10 px-4 py-3 text-xs text-white/40">
                  Content Preview
                </div>

                <div className="h-[calc(100%-41px)] overflow-y-auto px-4 py-4 text-sm leading-6 text-white/75 whitespace-pre-wrap">
                  {selectedItem.content ||
                    selectedItem.extracted_text ||
                    selectedItem.source_path ||
                    "No content available"}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* EDITOR MODAL */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[30px] border border-white/10 bg-[#05070f] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/90">
                  {editorMode === "create" ? "New Knowledge" : "Edit Knowledge"}
                </div>
                <h3 className="mt-1 text-xl font-semibold text-white">
                  {editorForm.title || "Untitled"}
                </h3>
              </div>

              <button
                onClick={() => setEditorOpen(false)}
                className="rounded-full border border-white/10 p-2 text-white/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                value={editorForm.title}
                onChange={(e) =>
                  setEditorForm({ ...editorForm, title: e.target.value })
                }
                placeholder="Title"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
              />

              <input
                value={editorForm.category}
                onChange={(e) =>
                  setEditorForm({ ...editorForm, category: e.target.value })
                }
                placeholder="Category"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
              />

              <select
                value={editorForm.source_type}
                onChange={(e) =>
                  setEditorForm({
                    ...editorForm,
                    source_type: e.target.value as KnowledgeSource,
                  })
                }
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
              >
                <option value="manual">Manual</option>
                <option value="github">GitHub</option>
                <option value="upload">Upload</option>
              </select>

              <select
                value={editorForm.status}
                onChange={(e) =>
                  setEditorForm({
                    ...editorForm,
                    status: e.target.value as KnowledgeStatus,
                  })
                }
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <textarea
              value={editorForm.content}
              onChange={(e) =>
                setEditorForm({ ...editorForm, content: e.target.value })
              }
              placeholder="Knowledge content..."
              className="mt-4 h-40 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />

            <textarea
              value={editorForm.admin_notes}
              onChange={(e) =>
                setEditorForm({ ...editorForm, admin_notes: e.target.value })
              }
              placeholder="Admin notes..."
              className="mt-4 h-20 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditorOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                onClick={saveEditor}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500 px-4 py-2 text-sm font-medium text-black hover:bg-cyan-400 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
