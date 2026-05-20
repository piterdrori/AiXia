import { supabase } from "@/lib/supabase";
import type {
  CustomFieldFormValue,
  CustomFieldPayloadItem,
  ProjectTaskFieldDefinitionRow,
  ProjectTaskFieldValueRow,
  TaskFieldType,
} from "./types";

export function usesValueText(fieldType: TaskFieldType): boolean {
  return (
    fieldType === "plain_text" ||
    fieldType === "textarea" ||
    fieldType === "datetime" ||
    fieldType === "radio_list" ||
    fieldType === "dropdown"
  );
}

export function usesValueJson(fieldType: TaskFieldType): boolean {
  return fieldType === "checkbox_list" || fieldType === "multi_select_dropdown";
}

export function normalizeFieldOptions(
  options: ProjectTaskFieldDefinitionRow["options_json"]
): { label: string; value: string }[] {
  if (!Array.isArray(options)) return [];
  return options.map((item) => {
    if (typeof item === "string") {
      return { label: item, value: item };
    }
    if (item && typeof item === "object" && "value" in item) {
      const row = item as { label?: string; value: string };
      return {
        label: row.label || row.value,
        value: row.value,
      };
    }
    return { label: String(item), value: String(item) };
  });
}

export async function loadProjectFieldDefinitions(
  projectId: string,
  options?: { includeArchived?: boolean; includeDeleted?: boolean }
): Promise<ProjectTaskFieldDefinitionRow[]> {
  let query = supabase
    .from("project_task_field_definitions")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!options?.includeDeleted) {
    query = query.neq("status", "deleted");
  }
  if (!options?.includeArchived) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ProjectTaskFieldDefinitionRow[];
}

export async function loadTaskFieldValues(
  taskId: string
): Promise<ProjectTaskFieldValueRow[]> {
  const { data, error } = await supabase
    .from("project_task_field_values")
    .select("*")
    .eq("task_id", taskId);

  if (error) throw error;
  return (data || []) as ProjectTaskFieldValueRow[];
}

export async function loadDefinitionsForTaskForm(
  projectId: string,
  taskId: string | null,
  mode: "create" | "edit"
): Promise<{
  definitions: ProjectTaskFieldDefinitionRow[];
  valuesByDefinitionId: Record<string, ProjectTaskFieldValueRow>;
}> {
  const [allDefinitions, existingValues] = await Promise.all([
    loadProjectFieldDefinitions(projectId, {
      includeArchived: mode === "edit",
      includeDeleted: false,
    }),
    taskId ? loadTaskFieldValues(taskId) : Promise.resolve([]),
  ]);

  const valuesByDefinitionId = Object.fromEntries(
    existingValues.map((row) => [row.field_definition_id, row])
  );

  const valueDefinitionIds = new Set(Object.keys(valuesByDefinitionId));

  const definitions = allDefinitions.filter((def) => {
    if (def.status === "active") {
      if (mode === "create") return def.include_by_default;
      return true;
    }
    if (def.status === "archived") {
      return valueDefinitionIds.has(def.id);
    }
    return false;
  });

  return { definitions, valuesByDefinitionId };
}

export function valuesFromRows(
  definitions: ProjectTaskFieldDefinitionRow[],
  valuesByDefinitionId: Record<string, ProjectTaskFieldValueRow>
): Record<string, CustomFieldFormValue> {
  const result: Record<string, CustomFieldFormValue> = {};

  for (const def of definitions) {
    const row = valuesByDefinitionId[def.id];
    if (usesValueJson(def.field_type)) {
      const json = row?.value_json;
      result[def.id] = {
        definitionId: def.id,
        valueText: null,
        valueJson: Array.isArray(json) ? json.map(String) : [],
      };
    } else {
      result[def.id] = {
        definitionId: def.id,
        valueText: row?.value_text ?? "",
        valueJson: null,
      };
    }
  }

  return result;
}

export function buildCustomFieldPayload(
  definitions: ProjectTaskFieldDefinitionRow[],
  formValues: Record<string, CustomFieldFormValue>
): CustomFieldPayloadItem[] {
  const payload: CustomFieldPayloadItem[] = [];

  for (const def of definitions) {
    const entry = formValues[def.id];
    if (!entry) continue;

    if (usesValueJson(def.field_type)) {
      const selected = (entry.valueJson || []).filter(Boolean);
      if (selected.length === 0 && !def.is_required) continue;
      payload.push({
        fieldDefinitionId: def.id,
        valueJson: selected,
      });
    } else {
      const text = (entry.valueText || "").trim();
      if (!text && !def.is_required) continue;
      payload.push({
        fieldDefinitionId: def.id,
        valueText: text || null,
      });
    }
  }

  return payload;
}

export function validateRequiredCustomFields(
  definitions: ProjectTaskFieldDefinitionRow[],
  formValues: Record<string, CustomFieldFormValue>
): string | null {
  for (const def of definitions) {
    if (!def.is_required || def.status !== "active") continue;
    const entry = formValues[def.id];
    if (usesValueJson(def.field_type)) {
      if (!entry?.valueJson?.length) {
        return def.title;
      }
    } else if (!(entry?.valueText || "").trim()) {
      return def.title;
    }
  }
  return null;
}

export async function upsertTaskCustomFieldValues(
  taskId: string,
  definitions: ProjectTaskFieldDefinitionRow[],
  formValues: Record<string, CustomFieldFormValue>
): Promise<void> {
  const payload = buildCustomFieldPayload(definitions, formValues);
  if (payload.length === 0) return;

  const rows = payload.map((item) => {
    const def = definitions.find((d) => d.id === item.fieldDefinitionId);
    if (!def) return null;

    return {
      task_id: taskId,
      field_definition_id: item.fieldDefinitionId,
      value_text: item.valueText ?? null,
      value_json: item.valueJson ?? null,
      updated_at: new Date().toISOString(),
    };
  }).filter(Boolean) as {
    task_id: string;
    field_definition_id: string;
    value_text: string | null;
    value_json: string[] | null;
    updated_at: string;
  }[];

  const { error } = await supabase
    .from("project_task_field_values")
    .upsert(rows, { onConflict: "task_id,field_definition_id" });

  if (error) throw error;
}

export async function countFieldDefinitionValues(
  definitionId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("project_task_field_values")
    .select("id", { count: "exact", head: true })
    .eq("field_definition_id", definitionId);

  if (error) throw error;
  return count ?? 0;
}
