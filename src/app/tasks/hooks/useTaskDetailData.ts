import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { canViewTask } from "@/lib/permissions";

import type {
  Role,
  TaskRow,
  ProjectRow,
  ProfileRow,
  TaskMemberRow,
  TaskCommentRow,
  FileUploadRow,
  TaskActivityRow,
  ProjectMemberRow,
} from "../lib/task.types";

interface TaskDetailState {
  task: TaskRow | null;
  project: ProjectRow | null;
  profiles: ProfileRow[];
  taskMembers: TaskMemberRow[];
  comments: TaskCommentRow[];
  files: FileUploadRow[];
  activity: TaskActivityRow[];
}

interface MetaState {
  currentUserId: string | null;
  currentUserRole: Role | null;
  isBootstrapping: boolean;
  isRefreshing: boolean;
  error: string;
}

const INITIAL_DATA: TaskDetailState = {
  task: null,
  project: null,
  profiles: [],
  taskMembers: [],
  comments: [],
  files: [],
  activity: [],
};

const INITIAL_META: MetaState = {
  currentUserId: null,
  currentUserRole: null,
  isBootstrapping: true,
  isRefreshing: false,
  error: "",
};

export function useTaskDetailData() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const requestTracker = useRef(createRequestTracker());

  const [data, setData] = useState<TaskDetailState>(INITIAL_DATA);
  const [meta, setMeta] = useState<MetaState>(INITIAL_META);

  const loadTaskPage = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!id) {
        navigate("/tasks");
        return;
      }

      const requestId = requestTracker.current.next();

      setMeta((prev) => ({
        ...prev,
        isBootstrapping: mode === "initial",
        isRefreshing: mode === "refresh",
        error: "",
      }));

      try {
        // AUTH
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!requestTracker.current.isLatest(requestId)) return;

        const user = session?.user;

        if (!user) {
          navigate("/login");
          return;
        }

        // PROFILE
        const { data: myProfile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (!requestTracker.current.isLatest(requestId)) return;

        if (profileError || !myProfile) {
          navigate("/tasks");
          return;
        }

        const role = myProfile.role as Role;

        // TASK
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

        // PARALLEL LOAD
        const [
          { data: projectData },
          { data: profilesData, error: profilesError },
          { data: taskMembersData, error: taskMembersError },
          { data: projectMembersData },
          { data: commentsData, error: commentsError },
          { data: filesData, error: filesError },
          { data: activityData, error: activityError },
        ] = await Promise.all([
          loadedTask.project_id
            ? supabase.from("projects").select("*").eq("id", loadedTask.project_id).single()
            : Promise.resolve({ data: null }),

          supabase.from("profiles").select("user_id, full_name, role, status").eq("status", "active"),

          supabase.from("task_members").select("id, task_id, user_id, role, created_at").eq("task_id", id),

          loadedTask.project_id
            ? supabase.from("project_members").select("id, project_id, user_id, role, created_at").eq("project_id", loadedTask.project_id)
            : Promise.resolve({ data: [] }),

          supabase.from("task_comments").select("*").eq("task_id", id).order("created_at", { ascending: true }),

          supabase.from("file_uploads").select("*").eq("task_id", id).eq("entity_type", "task").order("created_at", { ascending: false }),

          supabase.from("activity_logs").select("*").eq("task_id", id).order("created_at", { ascending: false }),
        ]);

        if (!requestTracker.current.isLatest(requestId)) return;

        if (profilesError || taskMembersError || commentsError || filesError || activityError) {
          throw new Error("Failed loading task detail data");
        }

        const safeTaskMembers = (taskMembersData || []) as TaskMemberRow[];
        const safeProjectMembers = (projectMembersData || []) as ProjectMemberRow[];

        const visibleProjectIds = new Set(
          safeProjectMembers.map((m) => m.project_id)
        );

        if (
          !canViewTask(
            loadedTask,
            user.id,
            role,
            safeTaskMembers,
            visibleProjectIds
          )
        ) {
          navigate("/tasks");
          return;
        }

        // ATOMIC UPDATE
        setData({
          task: loadedTask,
          project: (projectData || null) as ProjectRow | null,
          profiles: (profilesData || []) as ProfileRow[],
          taskMembers: safeTaskMembers,
          comments: (commentsData || []) as TaskCommentRow[],
          files: (filesData || []) as FileUploadRow[],
          activity: (activityData || []) as TaskActivityRow[],
        });

        setMeta({
          currentUserId: user.id,
          currentUserRole: role,
          isBootstrapping: false,
          isRefreshing: false,
          error: "",
        });
      } catch (err) {
        if (!requestTracker.current.isLatest(requestId)) return;

        console.error("useTaskDetailData error:", err);

        setMeta((prev) => ({
          ...prev,
          isBootstrapping: false,
          isRefreshing: false,
          error: "Failed to load task",
        }));
      }
    },
    [id, navigate]
  );

  useEffect(() => {
    void loadTaskPage("initial");
  }, [loadTaskPage]);

  return {
    id,
    ...data,
    ...meta,
    setTask: (task: TaskRow | null) =>
      setData((prev) => ({ ...prev, task })),
    setComments: (comments: TaskCommentRow[]) =>
      setData((prev) => ({ ...prev, comments })),
    setFiles: (files: FileUploadRow[]) =>
      setData((prev) => ({ ...prev, files })),
    setActivity: (activity: TaskActivityRow[]) =>
      setData((prev) => ({ ...prev, activity })),
    setTaskMembers: (members: TaskMemberRow[]) =>
      setData((prev) => ({ ...prev, taskMembers: members })),
    refresh: () => loadTaskPage("refresh"),
    requestTracker,
  };
}
