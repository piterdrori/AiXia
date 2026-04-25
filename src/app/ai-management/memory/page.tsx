import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Building2,
  CheckCircle2,
  Database,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Settings2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Wand2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type MemoryItem = {
  id: string;
  memory_key: string;
  memory_value: string;
  category: string | null;
  scope: string;
  is_active: boolean;
  priority: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type MemoryForm = {
  memory_key: string;
  memory_value: string;
  category: string;
  scope: string;
  priority: string;
  is_active: boolean;
};

const emptyForm: MemoryForm = {
  memory_key: "",
  memory_value: "",
  category: "",
  scope: "global",
  priority: "100",
  is_active: true,
};

const memoryPresets: Array<{
  title: string;
  description: string;
  form: MemoryForm;
}> = [
  {
    title: "Business Context",
    description: "Store stable company or product facts the AI should reuse.",
    form: {
      memory_key: "business_context",
      memory_value:
        "AiXia is an internal enterprise platform with finance, projects, tasks, employees, AI management, and operational modules.",
      category: "business-context",
      scope: "global",
      priority: "10",
      is_active: true,
    },
  },
  {
    title: "Working Style",
    description: "Store how the AI should work with the admin/operator.",
    form: {
      memory_key: "working_style",
      memory_value:
        "Use short execution-focused answers. For code changes, provide exact full remove-and-replace blocks. Avoid vague anchors and unnecessary explanation.",
      category: "behavior",
      scope: "global",
      priority: "10",
      is_active: true,
    },
  },
  {
    title: "System Architecture",
    description: "Store technical rules that should guide future AI reasoning.",
    form: {
      memory_key: "system_architecture",
      memory_value:
        "AiXia follows a DB-first and server-first architecture. Supabase owns business logic, RLS, triggers, and RPCs. Frontend should orchestrate and display, not replace backend rules.",
      category: "system-rule",
      scope: "global",
      priority: "10",
      is_active: true,
    },
  },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCategory(value: string | null) {
  return value?.trim() ? value : "Uncategorized";
}

export default function AIMemoryPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<MemoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<MemoryForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | "active" | "inactive">("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  const scopes = useMemo(() => {
    const uniqueScopes = new Set(
      items.map((item) => item.scope).filter(Boolean)
    );

    return Array.from(uniqueScopes).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.memory_key.toLowerCase().includes(normalizedSearch) ||
        item.memory_value.toLowerCase().includes(normalizedSearch) ||
        (item.category ?? "").toLowerCase().includes(normalizedSearch) ||
        item.scope.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.is_active) ||
        (statusFilter === "inactive" && !item.is_active);

      const matchesScope = scopeFilter === "all" || item.scope === scopeFilter;

      return matchesSearch && matchesStatus && matchesScope;
    });
  }, [items, scopeFilter, search, statusFilter]);

  const activeCount = useMemo(
    () => items.filter((item) => item.is_active).length,
    [items]
  );

  const inactiveCount = items.length - activeCount;

  const globalCount = useMemo(
    () => items.filter((item) => item.scope === "global").length,
    [items]
  );

  const highPriorityCount = useMemo(
    () => items.filter((item) => item.priority <= 10).length,
    [items]
  );

  useEffect(() => {
    void loadMemoryItems();
  }, []);

  useEffect(() => {
    if (!selectedItem || isCreating) return;

    setForm({
      memory_key: selectedItem.memory_key,
      memory_value: selectedItem.memory_value,
      category: selectedItem.category ?? "",
      scope: selectedItem.scope,
      priority: String(selectedItem.priority),
      is_active: selectedItem.is_active,
    });
  }, [isCreating, selectedItem]);

  async function loadMemoryItems() {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("ai_memory_items")
      .select(
        "id, memory_key, memory_value, category, scope, is_active, priority, metadata, created_at, updated_at"
      )
      .order("priority", { ascending: true })
      .order("updated_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as MemoryItem[];
    setItems(rows);

    if (!selectedId && rows.length > 0) {
      setSelectedId(rows[0].id);
    }

    setLoading(false);
  }

  function startCreate() {
    setIsCreating(true);
    setSelectedId(null);
    setForm(emptyForm);
    setErrorMessage(null);
    setActionMessage(null);
  }

  function selectItem(item: MemoryItem) {
    setIsCreating(false);
    setSelectedId(item.id);
    setErrorMessage(null);
    setActionMessage(null);
  }

  function applyPreset(preset: MemoryForm) {
    setIsCreating(true);
    setSelectedId(null);
    setForm({ ...preset });
    setErrorMessage(null);
    setActionMessage(null);
  }

  async function saveMemoryItem() {
    const memoryKey = form.memory_key.trim();
    const memoryValue = form.memory_value.trim();
    const priority = Number(form.priority);

    if (!memoryKey || !memoryValue) {
      setErrorMessage("Context name and context/instruction are required.");
      return;
    }

    if (!Number.isInteger(priority) || priority < 1) {
      setErrorMessage("Priority must be a positive whole number.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setActionMessage(null);

    const payload = {
      memory_key: memoryKey,
      memory_value: memoryValue,
      category: form.category.trim() || null,
      scope: form.scope.trim() || "global",
      priority,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    if (isCreating) {
      const { data, error } = await supabase
        .from("ai_memory_items")
        .insert(payload)
        .select(
          "id, memory_key, memory_value, category, scope, is_active, priority, metadata, created_at, updated_at"
        )
        .single();

      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }

      await supabase.from("ai_admin_activity_logs").insert({
        action_type: "memory_created",
        entity_type: "memory",
        entity_id: (data as MemoryItem).id,
        details: {
          memory_key: memoryKey,
          category: payload.category,
          scope: payload.scope,
          priority,
          is_active: form.is_active,
        },
      });

      setItems((current) =>
        [...current, data as MemoryItem].sort(
          (first, second) => first.priority - second.priority
        )
      );
      setSelectedId((data as MemoryItem).id);
      setIsCreating(false);
      setActionMessage("Context memory created.");
      setSaving(false);
      return;
    }

      if (!selectedItem) {
      setErrorMessage("No context memory selected.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("ai_memory_items")
      .update(payload)
      .eq("id", selectedItem.id)
      .select(
        "id, memory_key, memory_value, category, scope, is_active, priority, metadata, created_at, updated_at"
      )
      .single();

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "memory_updated",
      entity_type: "memory",
      entity_id: selectedItem.id,
      details: {
        memory_key: memoryKey,
        category: payload.category,
        scope: payload.scope,
        priority,
        is_active: form.is_active,
      },
    });

    setItems((current) =>
      current
        .map((item) =>
          item.id === selectedItem.id ? (data as MemoryItem) : item
        )
        .sort((first, second) => first.priority - second.priority)
    );
    setSelectedId((data as MemoryItem).id);
    setActionMessage("Context memory updated.");
    setSaving(false);
  }

  async function toggleActive(item: MemoryItem) {
    setSaving(true);
    setErrorMessage(null);
    setActionMessage(null);

    const nextActive = !item.is_active;

    const { data, error } = await supabase
      .from("ai_memory_items")
      .update({
        is_active: nextActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .select(
        "id, memory_key, memory_value, category, scope, is_active, priority, metadata, created_at, updated_at"
      )
      .single();

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: nextActive ? "memory_activated" : "memory_deactivated",
      entity_type: "memory",
      entity_id: item.id,
      details: {
        memory_key: item.memory_key,
        scope: item.scope,
        is_active: nextActive,
      },
    });

    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id ? (data as MemoryItem) : currentItem
      )
    );
    setSelectedId((data as MemoryItem).id);
    setActionMessage(
      nextActive ? "Context memory activated." : "Context memory deactivated."
    );
    setSaving(false);
  }

  async function deleteMemoryItem(item: MemoryItem) {
    const confirmed = window.confirm(
      `Delete context memory "${item.memory_key}" permanently?`
    );

    if (!confirmed) return;

    setSaving(true);
    setErrorMessage(null);
    setActionMessage(null);

    const { error } = await supabase
      .from("ai_memory_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "memory_deleted",
      entity_type: "memory",
      entity_id: item.id,
      details: {
        memory_key: item.memory_key,
        scope: item.scope,
      },
    });

    setItems((current) =>
      current.filter((currentItem) => currentItem.id !== item.id)
    );

    if (selectedId === item.id) {
      setSelectedId(null);
      setIsCreating(false);
      setForm(emptyForm);
    }

    setActionMessage("Context memory deleted.");
    setSaving(false);
  }

  const pageTitle = isCreating
    ? "Create Context Memory"
    : selectedItem
      ? "Context Memory Inspector"
      : "Context Memory Inspector";

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
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-purple-200">
                  <Brain className="h-3.5 w-3.5" />
                  Context Memory Layer
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                    Context Memory
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Store reusable AI context that is not an answer: company facts, working rules, system architecture, design direction, and long-term behavior instructions.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 lg:min-w-[720px]">
              <MetricCard label="Active" value={String(activeCount)} tone="emerald" />
              <MetricCard label="Inactive" value={String(inactiveCount)} tone="amber" />
              <MetricCard label="Global" value={String(globalCount)} tone="cyan" />
              <MetricCard label="High Priority" value={String(highPriorityCount)} tone="white" />
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <PurposeCard
            icon={Building2}
            title="Business Context"
            description="Reusable facts about AiXia, company structure, product scope, and operating model."
          />

          <PurposeCard
            icon={Settings2}
            title="System Rules"
            description="Architecture rules, workflow rules, and execution preferences that should guide future AI behavior."
          />

          <PurposeCard
            icon={Wand2}
            title="Behavior Memory"
            description="How the AI should speak, format instructions, handle code changes, and work with the operator."
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Context Memories
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      These are reusable context instructions, not exact Q&A answers.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void loadMemoryItems()}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Refresh
                    </button>

                    <button
                      type="button"
                      onClick={startCreate}
                      className="inline-flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-200 transition hover:border-purple-300/60 hover:bg-purple-500/20"
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
                      placeholder="Search context name, instruction, category, applies-to..."
                      className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-9 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-400/40 focus:outline-none"
                    />
                  </div>

                                    <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as "all" | "active" | "inactive")
                    }
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-300 focus:border-purple-400/40 focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>

                  <select
                    value={scopeFilter}
                    onChange={(event) => setScopeFilter(event.target.value)}
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-300 focus:border-purple-400/40 focus:outline-none"
                  >
                    <option value="all">All Applies-To</option>
                    {scopes.map((scope) => (
                      <option key={scope} value={scope}>
                        {scope}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="max-h-[620px] overflow-y-auto">
                {loading ? (
                  <div className="px-5 py-6 text-sm text-slate-400">
                    Loading context memories...
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-slate-500">
                    No context memories found.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {filteredItems.map((item) => {
                      const isSelected = item.id === selectedId && !isCreating;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => selectItem(item)}
                          className={`w-full px-5 py-4 text-left transition ${
                            isSelected ? "bg-purple-500/10" : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-white">
                                {item.memory_key}
                              </p>
                              <p className="line-clamp-2 text-sm text-slate-400">
                                {item.memory_value}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatCategory(item.category)} • applies to {item.scope} • Priority {item.priority}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {item.is_active ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <XCircle className="h-4 w-4 text-amber-400" />
                              )}
                            </div>
                          </div>

                          <div className="mt-2 text-[11px] text-slate-600">
                            Updated {formatDate(item.updated_at)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

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
                    Context Name
                  </label>
                  <input
                    value={form.memory_key}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        memory_key: event.target.value,
                      }))
                    }
                    placeholder="business_context, working_style, system_architecture"
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-purple-400/40 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Context / Instruction
                  </label>
                  <textarea
                    rows={7}
                    value={form.memory_value}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        memory_value: event.target.value,
                      }))
                    }
                    placeholder="Describe the reusable context, rule, or behavior instruction this AI should keep..."
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-purple-400/40 focus:outline-none"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Memory Category
                    </label>
                    <input
                      value={form.category}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                      placeholder="business-context, behavior, system-rule"
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-purple-400/40 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Applies To
                    </label>
                    <input
                      value={form.scope}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          scope: event.target.value,
                        }))
                      }
                      placeholder="global, finance, ai-management"
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-purple-400/40 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Priority
                    </label>
                    <input
                      type="number"
                      value={form.priority}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          priority: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-purple-400/40 focus:outline-none"
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
                    Active context memory
                  </label>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <Database className="h-4 w-4" />
                    Runtime Details
                  </div>

                  <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
                    <DetailCell label="Status" value={form.is_active ? "Active" : "Inactive"} />
                    <DetailCell label="Applies To" value={form.scope || "global"} />
                    <DetailCell
                      label="Created"
                      value={selectedItem ? formatDate(selectedItem.created_at) : "Not created yet"}
                    />
                    <DetailCell
                      label="Updated"
                      value={selectedItem ? formatDate(selectedItem.updated_at) : "Not created yet"}
                    />
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
                    onClick={() => void saveMemoryItem()}
                    disabled={saving}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-purple-400/30 bg-purple-500/10 px-4 py-3 text-sm font-semibold text-purple-100 transition hover:border-purple-300/60 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : isCreating ? "Create Context Memory" : "Save Changes"}
                  </button>

                  {selectedItem ? (
                    <button
                      type="button"
                      onClick={() => void toggleActive(selectedItem)}
                      disabled={saving}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {selectedItem.is_active ? (
                        <>
                          <ToggleLeft className="h-4 w-4 text-amber-300" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleRight className="h-4 w-4 text-emerald-300" />
                          Activate
                        </>
                      )}
                    </button>
                  ) : null}
                </div>

                                {selectedItem ? (
                  <button
                    type="button"
                    onClick={() => void deleteMemoryItem(selectedItem)}
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Context Memory
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Brain className="h-4 w-4" />
                Why Context Memory Exists
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Approved Answers are exact question-and-answer overrides. Context Memory is different:
                it stores reusable background instructions that help the AI understand AiXia, your working style,
                business rules, system architecture, and long-term preferences.
              </p>

              <div className="mt-4 rounded-2xl border border-purple-400/15 bg-purple-500/10 px-4 py-3 text-sm leading-6 text-purple-100/80">
                Memory should not store temporary chat details, secrets, passwords, tokens, or private personal data.
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <BookOpen className="h-4 w-4" />
                Quick Memory Templates
              </div>

              <div className="mt-4 grid gap-3">
                {memoryPresets.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => applyPreset(preset.form)}
                    className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-left transition hover:border-purple-400/30 hover:bg-purple-500/10"
                  >
                    <div className="text-sm font-semibold text-white">
                      {preset.title}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-slate-400">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
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

function PurposeCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Brain;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-3 text-purple-200">
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

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 break-words text-slate-200">{value}</p>
    </div>
  );
}
