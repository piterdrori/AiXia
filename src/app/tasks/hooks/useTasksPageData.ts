import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { useRequest } from "@/lib/useRequest";
import { getVisibleProjectIds, canViewTask } from "@/lib/permissions";
import { Role, TaskRow, ProjectRow, ProfileRow, TaskMemberRow, ProjectMemberRow } from "../lib/task.types";

export function useTasksPageData() {
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());
  const tasksPageRequest = useRequest<boolean>();
  
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [taskMembers, setTaskMembers] = useState<TaskMemberRow[]>([]);

  const loadTasksPage = async () => {
    const requestId = requestTracker.current.next();

    try {
      await tasksPageRequest.run(async () => {
        const session = await supabase.auth.getSession();
        const user = session.data.session?.user;

        if (!requestTracker.current.isLatest(requestId)) return true;

        if (!user) {
          navigate("/login");
          return true;
        }

        setCurrentUserId(user.id);

        const [
          { data: myProfile, error: myProfileError },
          { data: visibleTasksData, error: tasksError },
          { data: allProjects, error: projectsError },
          { data: allProfiles, error: profilesError },
          { data: allProjectMembers, error: projectMembersError },
          { data: allTaskMembers, error: taskMembersError },
        ] = await Promise.all([
          supabase.from("profiles").select("role").eq("user_id", user.id).single(),
          supabase.from("tasks").select("*").order("created_at", { ascending: false }),
          supabase.from("projects").select("id, name, created_by").order("created_at", { ascending: false }),
          supabase.from("profiles").select("user_id, full_name").eq("status", "active"),
          supabase.from("project_members").select("id, project_id, user_id, role, created_at"),
          supabase.from("task_members").select("id, task_id, user_id, role, created_at"),
        ]);

        if (!requestTracker.current.isLatest(requestId)) return true;

        if (myProfileError || !myProfile) {
          navigate("/login");
          return true;
        }

        const role = myProfile.role as Role;
        setCurrentUserRole(role);

        if (tasksError) throw tasksError;
        if (projectsError) throw projectsError;
        if (profilesError) throw profilesError;
        if (projectMembersError) throw projectMembersError;
        if (taskMembersError) throw taskMembersError;

        const tasksData = (visibleTasksData || []) as TaskRow[];
        const projectsData = (allProjects || []) as ProjectRow[];
        const profilesData = (allProfiles || []) as ProfileRow[];
        const projectMembersData = (allProjectMembers || []) as ProjectMemberRow[];
        const taskMembersData = (allTaskMembers || []) as TaskMemberRow[];

        const visibleProjectIds = getVisibleProjectIds(
          user.id,
          role,
          projectsData,
          projectMembersData
        );

        const visibleProjects =
          role === "admin"
            ? projectsData
            : projectsData.filter((project) => visibleProjectIds.has(project.id));

        const visibleTasks = tasksData.filter((task) =>
          canViewTask(task, user.id, role, taskMembersData, visibleProjectIds)
        );

        setTasks(visibleTasks);
        setProjects(visibleProjects);
        setProfiles(profilesData);
        setTaskMembers(taskMembersData);
        setHasLoadedOnce(true);

        return true;
      });
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Load tasks page error:", err);
      setTasks([]);
      setProjects([]);
      setProfiles([]);
      setTaskMembers([]);
    }
  };

  useEffect(() => {
    void loadTasksPage();
  }, []);

  return {
    currentUserId,
    currentUserRole,
    tasks,
    projects,
    profiles,
    taskMembers,
    hasLoadedOnce,
    isLoading: tasksPageRequest.status === "loading",
    error: tasksPageRequest.error,
    refresh: loadTasksPage,
    requestTracker,
  };
}
