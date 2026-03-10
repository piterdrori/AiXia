import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

type UploadProjectOrTaskFileInput = {
  file: File;
  entityType: "project" | "task";
  projectId?: string | null;
  taskId?: string | null;
};

export async function uploadProjectOrTaskFile({
  file,
  entityType,
  projectId = null,
  taskId = null,
}: UploadProjectOrTaskFileInput) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not authenticated.");
  }

  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  const baseFolder =
    entityType === "project"
      ? `projects/${projectId}`
      : `projects/${projectId}/tasks/${taskId}`;

  const filePath = `${baseFolder}/${timestamp}_${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("project-files")
    .upload(filePath, file, {
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload file.");
  }

  const { data: fileRow, error: insertError } = await supabase
    .from("file_uploads")
    .insert({
      project_id: projectId,
      task_id: taskId,
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type || null,
      entity_type: entityType,
    })
    .select()
    .single();

  if (insertError || !fileRow) {
    throw new Error(insertError?.message || "Failed to save file record.");
  }

  await logActivity({
    projectId,
    taskId,
    actionType: "file_uploaded",
    entityType: "file",
    entityId: fileRow.id,
    message: `Uploaded file "${file.name}"`,
  });

  return fileRow;
}

export async function getSignedFileUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from("project-files")
    .createSignedUrl(filePath, 60 * 60);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Failed to create signed URL.");
  }

  return data.signedUrl;
}

export async function deleteUploadedFile(
  fileId: string,
  filePath: string,
  options?: {
    projectId?: string | null;
    taskId?: string | null;
    fileName?: string | null;
  }
) {
  const { error: storageError } = await supabase.storage
    .from("project-files")
    .remove([filePath]);

  if (storageError) {
    throw new Error(storageError.message || "Failed to delete file from storage.");
  }

  const { error: deleteRowError } = await supabase
    .from("file_uploads")
    .delete()
    .eq("id", fileId);

  if (deleteRowError) {
    throw new Error(deleteRowError.message || "Failed to delete file record.");
  }

  await logActivity({
    projectId: options?.projectId || null,
    taskId: options?.taskId || null,
    actionType: "file_deleted",
    entityType: "file",
    entityId: fileId,
    message: `Deleted file "${options?.fileName || "file"}"`,
  });
}
