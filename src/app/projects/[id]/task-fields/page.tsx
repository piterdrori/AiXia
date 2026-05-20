import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Plus, Archive, Trash2 } from "lucide-react";
import { AixiaHero, AixiaPage } from "@/components/aixia";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { useLanguage } from "@/lib/i18n";
import { canEditProject, canPerform, type Role } from "@/lib/permissions";
import { countFieldDefinitionValues } from "@/lib/tasks/customFields";
import type {
  ProjectTaskFieldDefinitionRow,
  TaskFieldDefinitionStatus,
  TaskFieldType,
} from "@/lib/tasks/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import "@/styles/dashboard/tokens.css";
import "@/styles/dashboard/layout.css";
import "@/styles/dashboard/visual.css";
import "@/styles/projects/projects-visual.css";
import "@/styles/tasks/tasks-visual.css";

type ProjectRow = {
  id: string;
  name: string;
  created_by: string | null;
};

const FIELD_TYPES: TaskFieldType[] = [
  "plain_text",
  "textarea",
  "datetime",
  "checkbox_list",
  "radio_list",
  "dropdown",
  "multi_select_dropdown",
];

type FormState = {
  title: string;
  description: string;
  field_type: TaskFieldType;
  is_required: boolean;
  include_by_default: boolean;
  allows_multiple: boolean;
  optionsText: string;
  sort_order: number;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  field_type: "plain_text",
  is_required: false,
  include_by_default: true,
  allows_multiple: false,
  optionsText: "",
  sort_order: 0,
};

function parseOptionsText(text: string): { label: string; value: string }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, value] = line.split("|").map((part) => part.trim());
      if (value) return { label: label || value, value };
      return { label: line, value: line };
    });
}

function optionsToText(options: ProjectTaskFieldDefinitionRow["options_json"]): string {
  if (!Array.isArray(options)) return "";
  return options
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "value" in item) {
        const row = item as { label?: string; value: string };
        if (row.label && row.label !== row.value) {
          return `${row.label}|${row.value}`;
        }
        return row.value;
      }
      return String(item);
    })
    .join("\n");
}

export default function ProjectTaskFieldsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const requestTracker = useRef(createRequestTracker());

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [definitions, setDefinitions] = useState<ProjectTaskFieldDefinitionRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showDeleted, setShowDeleted] = useState(false);

  const loadPage = useCallback(async () => {
    if (!projectId) {
      navigate("/projects");
      return;
    }

    const requestId = requestTracker.current.next();
    setIsBootstrapping(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!requestTracker.current.isLatest(requestId)) return;
      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUserId(user.id);

      const [{ data: profile }, { data: projectData, error: projectError }] =
        await Promise.all([
          supabase.from("profiles").select("role").eq("user_id", user.id).single(),
          supabase
            .from("projects")
            .select("id, name, created_by")
            .eq("id", projectId)
            .single(),
        ]);

      if (!requestTracker.current.isLatest(requestId)) return;

      if (projectError || !projectData || !profile) {
        navigate("/projects");
        return;
      }

      const role = profile.role as Role;
      const loadedProject = projectData as ProjectRow;
      const manage =
        canEditProject(loadedProject, user.id, role) ||
        canPerform(role, "editAllProjects");

      if (!manage) {
        navigate(`/projects/${projectId}`);
        return;
      }

      setProject(loadedProject);
      setCanManage(manage);

      let query = supabase
        .from("project_task_field_definitions")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!showDeleted) {
        query = query.neq("status", "deleted");
      }

      const { data: defs, error: defsError } = await query;

      if (!requestTracker.current.isLatest(requestId)) return;
      if (defsError) {
        setError(defsError.message);
        return;
      }

      setDefinitions((defs || []) as ProjectTaskFieldDefinitionRow[]);
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Load task fields page:", err);
      setError("Failed to load custom fields.");
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsBootstrapping(false);
    }
  }, [navigate, projectId, showDeleted]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const visibleDefinitions = useMemo(
    () =>
      definitions.filter((def) => showDeleted || def.status !== "deleted"),
    [definitions, showDeleted]
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (def: ProjectTaskFieldDefinitionRow) => {
    setEditingId(def.id);
    setForm({
      title: def.title,
      description: def.description || "",
      field_type: def.field_type,
      is_required: def.is_required,
      include_by_default: def.include_by_default,
      allows_multiple: def.allows_multiple,
      optionsText: optionsToText(def.options_json),
      sort_order: def.sort_order,
    });
  };

  const handleSave = async () => {
    if (!projectId || !currentUserId || !canManage) return;
    if (!form.title.trim()) {
      setError("Field title is required.");
      return;
    }

    setIsSaving(true);
    setError("");

    const editingDefinition = editingId
      ? definitions.find((def) => def.id === editingId)
      : null;

    const payload = {
      project_id: projectId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      field_type: form.field_type,
      is_required: form.is_required,
      include_by_default: form.include_by_default,
      allows_multiple: form.allows_multiple,
      options_json: parseOptionsText(form.optionsText),
      sort_order: form.sort_order,
      updated_by: currentUserId,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from("project_task_field_definitions")
          .update({
            ...payload,
            status: editingDefinition?.status ?? "active",
          })
          .eq("id", editingId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("project_task_field_definitions")
          .insert({
            ...payload,
            status: "active" as TaskFieldDefinitionStatus,
            created_by: currentUserId,
          });

        if (insertError) throw insertError;
      }

      resetForm();
      await loadPage();
    } catch (err) {
      console.error("Save field definition:", err);
      setError(err instanceof Error ? err.message : "Failed to save field.");
    } finally {
      setIsSaving(false);
    }
  };

  const setDefinitionStatus = async (
    def: ProjectTaskFieldDefinitionRow,
    status: TaskFieldDefinitionStatus
  ) => {
    if (!currentUserId) return;

    if (status === "deleted") {
      const valueCount = await countFieldDefinitionValues(def.id);
      if (valueCount > 0) {
        setError(
          "This field has saved values. Archive it instead of deleting."
        );
        return;
      }
    }

    setError("");
    const { error: updateError } = await supabase
      .from("project_task_field_definitions")
      .update({
        status,
        updated_by: currentUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", def.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadPage();
  };

  const needsOptions =
    form.field_type === "checkbox_list" ||
    form.field_type === "radio_list" ||
    form.field_type === "dropdown" ||
    form.field_type === "multi_select_dropdown";

  return (
    <AixiaPage
      surface="command"
      className="aixia-command-page aixia-projects-page h-full flex flex-col overflow-hidden"
    >
      <AixiaHero
        surface="command"
        className="shrink-0"
        parentLabel={project?.name || t("projects.project", "Project")}
        parentPath={`/projects/${projectId}`}
        gradientTitle={project?.name || t("projects.project", "Project")}
        title={t("projects.taskFields.title", "Custom task fields")}
        subtitle={t(
          "projects.taskFields.subtitle",
          "Define fields used when creating and editing tasks in this project."
        )}
      />
      <div className="aixia-command-scroll flex min-h-0 flex-1 flex-col gap-4 p-4">
          {error ? (
            <Alert className="aixia-tasks-alert-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Card className="aixia-dash-panel aixia-dash-glass aixia-projects-panel-card">
            <CardContent className="p-6 space-y-4">
              <h2 className="aixia-dash-list-row-title text-base">
                {editingId ? "Edit field" : "Add field"}
              </h2>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="aixia-tasks-label">Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="aixia-tasks-input"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="aixia-tasks-label">
                    {t("projects.taskFields.sortOrder", "Sort order")}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        sort_order: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="aixia-tasks-input"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="aixia-tasks-label">Type</Label>
                  <Select
                    value={form.field_type}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, field_type: v as TaskFieldType }))
                    }
                    disabled={isSaving}
                  >
                    <SelectTrigger className="aixia-tasks-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="aixia-tasks-select-content">
                      {FIELD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="aixia-tasks-label">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={2}
                  className="bg-slate-950 aixia-tasks-divider text-white resize-none"
                  disabled={isSaving}
                />
              </div>

              {needsOptions ? (
                <div className="space-y-2">
                  <Label className="aixia-tasks-label">
                    Options (one per line, optional label|value)
                  </Label>
                  <Textarea
                    value={form.optionsText}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, optionsText: e.target.value }))
                    }
                    rows={4}
                    className="bg-slate-950 aixia-tasks-divider text-white resize-none font-mono text-sm"
                    disabled={isSaving}
                  />
                </div>
              ) : null}

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm text-white">
                  <Checkbox
                    checked={form.is_required}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, is_required: Boolean(v) }))
                    }
                    disabled={isSaving}
                  />
                  Required
                </label>
                <label className="flex items-center gap-2 text-sm text-white">
                  <Checkbox
                    checked={form.include_by_default}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, include_by_default: Boolean(v) }))
                    }
                    disabled={isSaving}
                  />
                  Include on new tasks by default
                </label>
                <label className="flex items-center gap-2 text-sm text-white">
                  <Checkbox
                    checked={form.allows_multiple}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, allows_multiple: Boolean(v) }))
                    }
                    disabled={isSaving}
                  />
                  Allow multiple selections
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  className="aixia-dash-action aixia-dash-action--primary h-9"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {editingId ? "Save changes" : "Add field"}
                </Button>
                {editingId ? (
                  <Button
                    variant="outline"
                    className="aixia-dash-action h-9"
                    onClick={resetForm}
                    disabled={isSaving}
                  >
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="aixia-dash-panel aixia-dash-glass aixia-projects-panel-card">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="aixia-dash-list-row-title text-base">Fields</h2>
                <label className="flex items-center gap-2 text-sm aixia-projects-muted">
                  <Checkbox
                    checked={showDeleted}
                    onCheckedChange={(v) => setShowDeleted(Boolean(v))}
                  />
                  Show deleted
                </label>
              </div>

              {isBootstrapping ? (
                <p className="aixia-projects-muted text-sm">Loading…</p>
              ) : visibleDefinitions.length === 0 ? (
                <p className="aixia-projects-muted text-sm">No custom fields yet.</p>
              ) : (
                <div className="space-y-2">
                  {visibleDefinitions.map((def) => (
                    <div
                      key={def.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border aixia-tasks-divider bg-slate-950/40 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-white font-medium">{def.title}</p>
                        <p className="aixia-projects-muted text-xs">
                          {def.field_type.replace(/_/g, " ")} · sort {def.sort_order}
                          {def.status !== "active" ? ` · ${def.status}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="aixia-dash-action h-8"
                          onClick={() => startEdit(def)}
                        >
                          Edit
                        </Button>
                        {def.status === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="aixia-dash-action h-8"
                            onClick={() => void setDefinitionStatus(def, "archived")}
                          >
                            <Archive className="h-3.5 w-3.5 mr-1" />
                            Archive
                          </Button>
                        ) : def.status === "archived" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="aixia-dash-action h-8"
                            onClick={() => void setDefinitionStatus(def, "active")}
                          >
                            Restore
                          </Button>
                        ) : null}
                        {def.status !== "deleted" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="aixia-dash-action aixia-dash-action--danger h-8"
                            onClick={() => void setDefinitionStatus(def, "deleted")}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </AixiaPage>
  );
}
