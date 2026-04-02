import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { canViewTask } from "@/lib/permissions";
import type { Role, TaskRow, ProjectRow, ProfileRow, TaskMemberRow, TaskCommentRow, FileUploadRow, TaskActivityRow, ProjectMemberRow } from "../lib/task.types";

export function useTaskDetailData() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const requestTracker = useRef(createRequestTracker());

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  
  const [task, setTask] = useState<TaskRow | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [taskMembers, setTaskMembers] = useState<TaskMemberRow[]>([]);
  const [comments, setComments] = useState<TaskCommentRow[]>([]);
  const [files, setFiles] = useState<FileUploadRow[]>([]);
  const [activity, setActivity] = useState<TaskActivityRow[]>([]);
  const [error, setError] = useState("");

  const loadTaskPage = async (mode: "initial" | "refresh" = "initial") => {
    if (!id) {
      navigate("/tasks");
      return;
    }

    const requestId = requestTracker.current.next();

    if (mode === "initial") {
      setIsBootstrapping(true);
    } else {
      setIsRefreshing(true);
    }

    setError("");

    try {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;

      if (!requestTracker.current.isLatest(requestId)) return;

      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data: myProfile, error: myProfileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (myProfileError || !myProfile) {
        navigate("/tasks");
        return;
      }

      const role = myProfile.role as Role;
      setCurrentUserRole(role);

      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .single();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (taskError || !taskData) {
        navigate("/tasks");
        return;
      }

      const loadedTask = taskData as TaskRow;

      const [
        { data: projectData },
        { data: profilesData },
        { data: taskMembersData },
        { data: projectMembersData },
        { data: commentsData },
        { data: filesData },
        { data: activityData },
      ] = await Promise.all([
        loadedTask.project_id
          ? supabase.from("projects").select("*").eq("id", loadedTask.project_id).single()
          : Promise.resolve({ data: null }),
        supabase.from("profiles").select("user_id, full_name, role, status").eq("status", "active"),
        supabase.from("task_members").select("id, task_id, user_id, role, created_at").eq("task_id", id),
        loadedTask.project_id
          ? supabase.from("project_members").select("id, project_id, user_id, role, created_at").eq("project_id", loadedTask.project_id)
          : Promise.resolve({ data: [] }),
        supabase.from("task_comments").select("id, task_id, user_id, content, created_at").eq("task_id", id).order("created_at", { ascending: true }),
        supabase.from("file_uploads").select("id, project_id, task_id, user_id, file_name, file_path, file_size, mime_type, entity_type, created_at").eq("task_id", id).eq("entity_type", "task").order("created_at", { ascending: false }),
        supabase.from("activity_logs").select("id, project_id, task_id, user_id, action_type, entity_type, entity_id, message, created_at").eq("task_id", id).order("created_at", { ascending: false }),
      ]);

      if (!requestTracker.current.isLatest(requestId)) return;

      const loadedTaskMembers = (taskMembersData || []) as TaskMemberRow[];
      const loadedProjectMembers = (projectMembersData || []) as ProjectMemberRow[];

      const visibleProjectIds = new Set(loadedProjectMembers.map((m) => m.project_id));

      if (!canViewTask(loadedTask, user.id, role, loadedTaskMembers, visibleProjectIds)) {
        navigate("/tasks");
        return;
      }

      setTask(loadedTask);
      setProject((projectData || null) as ProjectRow | null);
      setProfiles((profilesData || []) as ProfileRow[]);
      setTaskMembers(loadedTaskMembers);
      setComments((commentsData || []) as TaskCommentRow[]);
      setFiles((filesData || []) as FileUploadRow[]);
      setActivity((activityData || []) as TaskActivityRow[]);
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Load task detail error:", err);
      setError("Failed to load task");
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsBootstrapping(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadTaskPage("initial");
  }, [id]);

  return {
    id,
    task,
    project,
    profiles,
    taskMembers,
    comments,
    files,
    activity,
    currentUserId,
    currentUserRole,
    isBootstrapping,
    isRefreshing,
    error,
    setTask,
    setComments,
    setFiles,
    setActivity,
    setTaskMembers,
    loadTaskPage,
    requestTracker,
  };
}
