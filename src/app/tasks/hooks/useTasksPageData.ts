import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { useRequest } from "@/lib/useRequest";
import { getVisibleProjectIds, canViewTask } from "@/lib/permissions";

import type {
  Role,
  TaskRow,
  ProjectRow,
  ProfileRow,
  TaskMemberRow,
  ProjectMemberRow,
} from "../lib/task.types";

interface TasksPageState {
  currentUserId: string | null;
  currentUserRole: Role | null;
  tasks: TaskRow[];
  projects: ProjectRow[];
  profiles: ProfileRow[];
  taskMembers: TaskMemberRow[];
  hasLoadedOnce: boolean;
}

const INITIAL_STATE: TasksPageState = {
  currentUserId: null,
  currentUserRole: null,
  tasks: [],
  projects: [],
  profiles: [],
  taskMembers: [],
  hasLoadedOnce: false,
};

export function useTasksPageData() {
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());
  const tasksPageRequest = useRequest<boolean>();

  const [state, setState] = useState<TasksPageState>(INITIAL_STATE);

  const loadTasksPage = useCallback(async () => {
    const requestId = requestTracker.current.next();

    try {
      await tasksPageRequest.run(async () => {
        // AUTH
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!requestTracker.current.isLatest(requestId)) return true;

        const user = session?.user;

        if (!user) {
          navigate("/login");
          return true;
        }

        // FETCH ALL IN PARALLEL
        const [
          { data: myProfile, error: myProfileError },
          { data: tasksData, error: tasksError },
          { data: projectsData, error: projectsError },
          { data: profilesData, error: profilesError },
          { data: projectMembersData, error: projectMembersError },
          { data: taskMembersData, error: taskMembersError },
        ] = await Promise.all([
          supabase.from("profiles").select("role").eq("user_id", user.id).single(),
          supabase.from("tasks").select("*").order("created_at", { ascending: false }),
          supabase.from("projects").select("id, name, created_by").order("created_at", { ascending: false }),
          supabase.from("profiles").select("user_id, full_name, role, status").eq("status", "active"),
          supabase.from("project_members").select("id, project_id, user_id, role, created_at"),
          supabase.from("task_members").select("id, task_id, user_id, role, created_at"),
        ]);

        if (!requestTracker.current.isLatest(requestId)) return true;

        // HARD FAILS
        if (myProfileError || !myProfile) {
          navigate("/login");
          return true;
        }

        if (tasksError || projectsError || profilesError || projectMembersError || taskMembersError) {
          throw new Error("Failed loading tasks page data");
        }

        const role = myProfile.role as Role;

        const safeTasks = (tasksData || []) as TaskRow[];
        const safeProjects = (projectsData || []) as ProjectRow[];
        const safeProfiles = (profilesData || []) as ProfileRow[];
        const safeProjectMembers = (projectMembersData || []) as ProjectMemberRow[];
        const safeTaskMembers = (taskMembersData || []) as TaskMemberRow[];

        // PERMISSION FILTERING
        const visibleProjectIds = getVisibleProjectIds(
          user.id,
          role,
          safeProjects,
          safeProjectMembers
        );

        const visibleProjects =
          role === "admin"
            ? safeProjects
            : safeProjects.filter((p) => visibleProjectIds.has(p.id));

        const visibleTasks = safeTasks.filter((task) =>
          canViewTask(task, user.id, role, safeTaskMembers, visibleProjectIds)
        );

        // ATOMIC STATE UPDATE
        setState({
          currentUserId: user.id,
          currentUserRole: role,
          tasks: visibleTasks,
          projects: visibleProjects,
          profiles: safeProfiles,
          taskMembers: safeTaskMembers,
          hasLoadedOnce: true,
        });

        return true;
      });
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;

      console.error("useTasksPageData error:", err);

      setState((prev) => ({
        ...prev,
        tasks: [],
        projects: [],
        profiles: [],
        taskMembers: [],
      }));
    }
  }, [navigate, tasksPageRequest]);

  useEffect(() => {
    void loadTasksPage();
  }, [loadTasksPage]);

  return {
    ...state,
    isLoading: tasksPageRequest.status === "loading",
    error: tasksPageRequest.error,
    refresh: loadTasksPage,
    requestTracker,
  };
}
