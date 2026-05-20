import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Role = "admin" | "manager" | "employee" | "guest";

type CustomFieldPayloadItem = {
  fieldDefinitionId: string;
  valueText?: string | null;
  valueJson?: string[] | null;
};

type TaskCreateBody = {
  title: string;
  description?: string | null;
  projectId: string;
  project_id?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  startDate?: string | null;
  start_date?: string | null;
  dueDate?: string | null;
  due_date?: string | null;
  parentTaskId?: string | null;
  parent_task_id?: string | null;
  assigneeIds?: string[];
  assignee_ids?: string[];
  customFieldValues?: CustomFieldPayloadItem[];
};

function readParentTaskId(body: TaskCreateBody): string | null {
  const raw = body.parentTaskId ?? body.parent_task_id;
  if (raw == null) return null;
  const value = String(raw).trim();
  return value.length > 0 ? value : null;
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeAssigneeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  );
}

function normalizeCustomFieldValues(value: unknown): CustomFieldPayloadItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const fieldDefinitionId = String(row.fieldDefinitionId || "").trim();
      if (!fieldDefinitionId) return null;
      return {
        fieldDefinitionId,
        valueText:
          row.valueText === null || row.valueText === undefined
            ? null
            : String(row.valueText),
        valueJson: Array.isArray(row.valueJson)
          ? row.valueJson.map((v) => String(v)).filter(Boolean)
          : undefined,
      } satisfies CustomFieldPayloadItem;
    })
    .filter((item): item is CustomFieldPayloadItem => Boolean(item));
}

function canCreateTasks(role: Role): boolean {
  return role === "admin" || role === "manager" || role === "employee" || role === "guest";
}

const JSON_FIELD_TYPES = new Set(["checkbox_list", "multi_select_dropdown"]);
const TEXT_FIELD_TYPES = new Set([
  "plain_text",
  "textarea",
  "datetime",
  "radio_list",
  "dropdown",
]);

function usesValueJson(fieldType: string): boolean {
  return JSON_FIELD_TYPES.has(fieldType);
}

function validateCustomFieldValuesForCreate(
  definitions: Array<{
    id: string;
    field_type: string;
    status: string;
    is_required: boolean;
  }>,
  values: CustomFieldPayloadItem[],
): string | null {
  const definitionById = new Map(definitions.map((row) => [row.id, row]));
  const submittedIds = new Set(values.map((item) => item.fieldDefinitionId));

  for (const def of definitions) {
    if (def.status !== "active") {
      if (submittedIds.has(def.id)) {
        return "Custom field is not active.";
      }
      continue;
    }

    const item = values.find((row) => row.fieldDefinitionId === def.id);
    const usesJson = usesValueJson(def.field_type);

    if (def.is_required) {
      if (usesJson) {
        if (!item?.valueJson?.length) {
          return "A required custom field is missing.";
        }
      } else if (!(item?.valueText || "").trim()) {
        return "A required custom field is missing.";
      }
    }

    if (!item) continue;

    if (usesJson) {
      if (item.valueText != null && String(item.valueText).trim() !== "") {
        return "Invalid custom field value storage.";
      }
      if (!Array.isArray(item.valueJson)) {
        return "Invalid custom field value storage.";
      }
    } else if (!TEXT_FIELD_TYPES.has(def.field_type)) {
      return "Invalid custom field type.";
    } else {
      if (item.valueJson != null && Array.isArray(item.valueJson) && item.valueJson.length > 0) {
        return "Invalid custom field value storage.";
      }
    }
  }

  for (const item of values) {
    if (!definitionById.has(item.fieldDefinitionId)) {
      return "One or more custom fields are invalid for this project.";
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      success: false,
      error: "Method not allowed.",
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(401, {
        success: false,
        error: "Missing authorization header.",
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse(401, {
        success: false,
        error: "Unauthorized.",
      });
    }

    const body = (await req.json()) as TaskCreateBody;

    const title = String(body.title || "").trim();
    const description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : null;
    const projectId = String(body.projectId || body.project_id || "").trim();
    const priority = String(body.priority || "MEDIUM").trim().toUpperCase();
    const status = String(body.status || "TODO").trim().toUpperCase();
    const startDateRaw = body.startDate ?? body.start_date;
    const startDate =
      typeof startDateRaw === "string" && startDateRaw.trim().length > 0
        ? startDateRaw.trim()
        : null;
    const dueDateRaw = body.dueDate ?? body.due_date;
    const dueDate =
      typeof dueDateRaw === "string" && dueDateRaw.trim().length > 0
        ? dueDateRaw.trim()
        : null;
    const parentTaskId = readParentTaskId(body);
    const assigneeIds = normalizeAssigneeIds(body.assigneeIds ?? body.assignee_ids);
    const customFieldValues = normalizeCustomFieldValues(body.customFieldValues);

    if (!title) {
      return jsonResponse(400, {
        success: false,
        error: "Task title is required.",
      });
    }

    if (!projectId) {
      return jsonResponse(400, {
        success: false,
        error: "Project is required.",
      });
    }

    if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) {
      return jsonResponse(400, {
        success: false,
        error: "Invalid priority.",
      });
    }

    if (!["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(status)) {
      return jsonResponse(400, {
        success: false,
        error: "Invalid status.",
      });
    }

    if (startDate && Number.isNaN(new Date(startDate).getTime())) {
      return jsonResponse(400, {
        success: false,
        error: "Invalid start date.",
      });
    }

    if (dueDate && Number.isNaN(new Date(dueDate).getTime())) {
      return jsonResponse(400, {
        success: false,
        error: "Invalid due date.",
      });
    }

    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return jsonResponse(403, {
        success: false,
        error: "Profile not found.",
      });
    }

    const requesterRole = profile.role as Role;

    if (!canCreateTasks(requesterRole)) {
      return jsonResponse(403, {
        success: false,
        error: "Not authorized to create tasks.",
      });
    }

    const { data: projectAccess, error: accessError } = await userClient.rpc(
      "can_access_project",
      {
        project_uuid: projectId,
      },
    );

    if (accessError) {
      return jsonResponse(500, {
        success: false,
        error: accessError.message || "Failed to validate project access.",
      });
    }

    if (!projectAccess) {
      return jsonResponse(403, {
        success: false,
        error: "You do not have access to this project.",
      });
    }

    const { data: project, error: projectError } = await userClient
      .from("projects")
      .select("id, name, created_by")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return jsonResponse(404, {
        success: false,
        error: "Project not found.",
      });
    }

    if (parentTaskId) {
      const { data: parentTask, error: parentError } = await userClient
        .from("tasks")
        .select("id, project_id, parent_task_id, deleted_at, archived_at")
        .eq("id", parentTaskId)
        .single();

      if (parentError || !parentTask) {
        return jsonResponse(400, {
          success: false,
          error: "Parent task not found.",
        });
      }

      if (parentTask.project_id !== projectId) {
        return jsonResponse(400, {
          success: false,
          error: "Parent task must belong to the same project.",
        });
      }

      if (parentTask.parent_task_id) {
        return jsonResponse(400, {
          success: false,
          error: "Parent task must be a top-level task.",
        });
      }

      if (parentTask.deleted_at) {
        return jsonResponse(400, {
          success: false,
          error: "Cannot create a subtask under a deleted task.",
        });
      }

      if (parentTask.archived_at) {
        return jsonResponse(400, {
          success: false,
          error: "Cannot create a subtask under an archived task.",
        });
      }
    }

    const nowIso = new Date().toISOString();

    const taskInsertPayload = {
      title,
      description,
      status,
      priority,
      project_id: projectId,
      parent_task_id: parentTaskId,
      start_date: startDate,
      due_date: dueDate,
      created_by: user.id,
      assignee_id: assigneeIds[0] ?? null,
      updated_at: nowIso,
    };

    // Subtasks must persist parent_task_id; service role insert avoids silent drops.
    const insertClient = parentTaskId ? adminClient : userClient;

    const { data: task, error: taskError } = await insertClient
      .from("tasks")
      .insert(taskInsertPayload)
      .select("id, title, project_id, parent_task_id, created_by, assignee_id, created_at, updated_at")
      .single();

    if (taskError || !task) {
      return jsonResponse(500, {
        success: false,
        error: taskError?.message || "Failed to create task.",
      });
    }

    if (parentTaskId && task.parent_task_id !== parentTaskId) {
      const { data: relinked, error: linkError } = await adminClient
        .from("tasks")
        .update({ parent_task_id: parentTaskId, updated_at: nowIso })
        .eq("id", task.id)
        .select("parent_task_id")
        .single();

      if (linkError || !relinked || relinked.parent_task_id !== parentTaskId) {
        await adminClient.from("tasks").delete().eq("id", task.id);
        return jsonResponse(500, {
          success: false,
          error: "Task was created without a parent link. Please try again.",
        });
      }

      task.parent_task_id = relinked.parent_task_id;
    }

    if (assigneeIds.length > 0) {
      const memberRows = assigneeIds.map((assigneeId) => ({
        task_id: task.id,
        user_id: assigneeId,
        role: "assignee",
      }));

      const { error: memberInsertError } = await userClient
        .from("task_members")
        .insert(memberRows);

      if (memberInsertError) {
        await adminClient.from("tasks").delete().eq("id", task.id);

        return jsonResponse(500, {
          success: false,
          error: memberInsertError.message || "Failed to assign task members.",
        });
      }
    }

    const { data: activeDefinitions, error: activeDefinitionsError } = await userClient
      .from("project_task_field_definitions")
      .select("id, project_id, field_type, status, is_required")
      .eq("project_id", projectId)
      .eq("status", "active");

    if (activeDefinitionsError) {
      await adminClient.from("tasks").delete().eq("id", task.id);
      return jsonResponse(500, {
        success: false,
        error: activeDefinitionsError.message || "Failed to validate custom fields.",
      });
    }

    const validationError = validateCustomFieldValuesForCreate(
      activeDefinitions || [],
      customFieldValues,
    );

    if (validationError) {
      await adminClient.from("tasks").delete().eq("id", task.id);
      return jsonResponse(400, {
        success: false,
        error: validationError,
      });
    }

    if (customFieldValues.length > 0) {
      const definitionIds = customFieldValues.map((item) => item.fieldDefinitionId);
      const definitions = (activeDefinitions || []).filter((row) =>
        definitionIds.includes(row.id as string)
      );

      if (definitions.length !== definitionIds.length) {
        await adminClient.from("tasks").delete().eq("id", task.id);
        return jsonResponse(400, {
          success: false,
          error: "One or more custom fields are invalid or not active for this project.",
        });
      }

      const definitionById = new Map(
        definitions.map((row) => [row.id as string, row]),
      );

      const valueRows = customFieldValues.map((item) => {
        const def = definitionById.get(item.fieldDefinitionId);
        const usesJson = usesValueJson(String(def?.field_type || ""));

        return {
          task_id: task.id,
          field_definition_id: item.fieldDefinitionId,
          value_text: usesJson ? null : item.valueText ?? null,
          value_json: usesJson ? item.valueJson ?? [] : null,
          updated_at: nowIso,
        };
      });

      const { error: valuesError } = await userClient
        .from("project_task_field_values")
        .insert(valueRows);

      if (valuesError) {
        await adminClient.from("tasks").delete().eq("id", task.id);
        return jsonResponse(500, {
          success: false,
          error: valuesError.message || "Failed to save custom field values.",
        });
      }
    }

    const activityRows = [
      {
        project_id: projectId,
        task_id: task.id,
        user_id: user.id,
        action_type: parentTaskId ? "subtask_created" : "task_created",
        entity_type: "task",
        entity_id: task.id,
        message: parentTaskId
          ? `Created subtask "${title}"`
          : `Created task "${title}"`,
      },
      ...(assigneeIds.length > 0
        ? [
            {
              project_id: projectId,
              task_id: task.id,
              user_id: user.id,
              action_type: "task_assignees_added",
              entity_type: "member",
              entity_id: task.id,
              message: `Assigned ${assigneeIds.length} member(s) to task "${title}"`,
            },
          ]
        : []),
    ];

    const { error: activityError } = await adminClient
      .from("activity_logs")
      .insert(activityRows);

    if (activityError) {
      console.error("task-create activity insert error:", activityError);
    }

    if (assigneeIds.length > 0) {
      const notificationRows = assigneeIds
        .filter((assigneeId) => assigneeId !== user.id)
        .map((assigneeId) => ({
          user_id: assigneeId,
          actor_user_id: user.id,
          type: "TASK_ASSIGNED",
          title: "New Task Assigned",
          message: `You were assigned to task "${title}"`,
          link: `/tasks/${task.id}`,
          is_read: false,
          entity_type: "task",
          entity_id: task.id,
        }));

      if (notificationRows.length > 0) {
        const { error: notificationError } = await adminClient
          .from("notifications")
          .insert(notificationRows);

        if (notificationError) {
          console.error("task-create notification insert error:", notificationError);
        }
      }
    }

    return jsonResponse(200, {
      success: true,
      task,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error.";

    return jsonResponse(500, {
      success: false,
      error: message,
    });
  }
});
