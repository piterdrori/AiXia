import { supabase } from "@/lib/supabase";

type LogActivityInput = {
  projectId?: string | null;
  taskId?: string | null;
  actionType: string;
  entityType: "project" | "task" | "file" | "member" | "comment" | "system";
  entityId?: string | null;
  message: string;
};

export async function logActivity({
  projectId = null,
  taskId = null,
  actionType,
  entityType,
  entityId = null,
  message,
}: LogActivityInput) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || null;

    const { error } = await supabase.from("activity_logs").insert({
      project_id: projectId,
      task_id: taskId,
      user_id: userId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      message,
    });

    if (error) {
      console.error("Activity log insert error:", error);
    }
  } catch (err) {
    console.error("Activity logger error:", err);
  }
}
