import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Role = "admin" | "manager" | "employee" | "guest";

type TaskCreateBody = {
  title: string;
  description?: string | null;
  projectId: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  dueDate?: string | null;
  assigneeIds?: string[];
};

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

function canCreateTasks(role: Role): boolean {
  return role === "admin" || role === "manager" || role === "employee" || role === "guest";
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
    const projectId = String(body.projectId || "").trim();
    const priority = String(body.priority || "MEDIUM").trim().toUpperCase();
    const status = String(body.status || "TODO").trim().toUpperCase();
    const dueDate =
      typeof body.dueDate === "string" && body.dueDate.trim().length > 0
        ? body.dueDate.trim()
        : null;
    const assigneeIds = normalizeAssigneeIds(body.assigneeIds);

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

    const nowIso = new Date().toISOString();

    const { data: task, error: taskError } = await userClient
      .from("tasks")
      .insert({
        title,
        description,
        status,
        priority,
        project_id: projectId,
        due_date: dueDate,
        created_by: user.id,
        assignee_id: assigneeIds[0] ?? null,
        updated_at: nowIso,
      })
      .select("id, title, project_id, created_by, assignee_id, created_at, updated_at")
      .single();

    if (taskError || !task) {
      return jsonResponse(500, {
        success: false,
        error: taskError?.message || "Failed to create task.",
      });
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

    const activityRows = [
      {
        project_id: projectId,
        task_id: task.id,
        user_id: user.id,
        action_type: "task_created",
        entity_type: "task",
        entity_id: task.id,
        message: `Created task "${title}"`,
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
