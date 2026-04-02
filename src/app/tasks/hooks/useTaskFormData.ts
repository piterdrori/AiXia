import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { canPerform } from "@/lib/permissions";
import type { Role, ProjectRow, ProjectMemberRow, ProfileRow, TaskPriority, TaskStatus } from "../lib/task.types";
import { DEFAULT_TASK_STATUS, DEFAULT_TASK_PRIORITY } from "../lib/task.types";

export function useTaskFormData() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pageRequestTracker = useRef(createRequestTracker());
  const membersRequestTracker = useRef(createRequestTracker());

  const initialProjectId = searchParams.get("projectId") || "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(initialProjectId);
  const [priority, setPriority] = useState<TaskPriority>(DEFAULT_TASK_PRIORITY);
  const [status, setStatus] = useState<TaskStatus>(DEFAULT_TASK_STATUS);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberRow[]>([]);
  const [allProjectMembers, setAllProjectMembers] = useState<ProjectMemberRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadPage = async () => {
      const requestId = pageRequestTracker.current.next();
      setIsBootstrapping(true);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted || !pageRequestTracker.current.isLatest(requestId)) return;

        if (!user) {
          navigate("/login");
          return;
        }

        setCurrentUserId(user.id);

        const [
          { data: myProfile, error: myProfileError },
          { data: allProjects },
          { data: allProjectMembers },
          { data: allProfiles },
        ] = await Promise.all([
          supabase.from("profiles").select("role").eq("user_id", user.id).single(),
          supabase.from("projects").select("id, name, created_by").order("created_at", { ascending: false }),
          supabase.from("project_members").select("id, project_id, user_id, role, created_at"),
          supabase.from("profiles").select("user_id, full_name, role, status").eq("status", "active").order("full_name", { ascending: true }),
        ]);

        if (!mounted || !pageRequestTracker.current.isLatest(requestId)) return;
        if (myProfileError || !myProfile) {
          navigate("/tasks");
          return;
        }

        const role = myProfile.role as Role;
        setCurrentUserRole(role);

        if (!canPerform(role, "createTasks")) {
          navigate("/tasks");
          return;
        }

        const projectsData = (allProjects || []) as ProjectRow[];
        const projectMembersData = (allProjectMembers || []) as ProjectMemberRow[];
        const profilesData = (allProfiles || []) as ProfileRow[];

        const visibleProjects = role === "admin"
          ? projectsData
          : projectsData.filter((project) => {
              const isCreator = project.created_by === user.id;
              const isAssigned = projectMembersData.some(
                (member) => member.project_id === project.id && member.user_id === user.id
              );
              return isCreator || isAssigned;
            });

        const safeProjectId = initialProjectId && visibleProjects.some((p) => p.id === initialProjectId)
          ? initialProjectId
          : "";

        setProjects(visibleProjects);
        setProfiles(profilesData);
        setAllProjectMembers(projectMembersData);
        setProjectId(safeProjectId);

        if (safeProjectId) {
          const initialMembers = projectMembersData.filter((m) => m.project_id === safeProjectId);
          setProjectMembers(initialMembers);
        }
      } catch (err) {
        if (!mounted || !pageRequestTracker.current.isLatest(requestId)) return;
        console.error("Load task form data error:", err);
      } finally {
        if (!mounted || !pageRequestTracker.current.isLatest(requestId)) return;
        setIsBootstrapping(false);
      }
    };

    void loadPage();
    return () => { mounted = false; };
  }, [navigate, initialProjectId]);

  useEffect(() => {
    let mounted = true;

    const loadMembers = async () => {
      const requestId = membersRequestTracker.current.next();

      if (!projectId) {
        setProjectMembers([]);
        setSelectedAssignees([]);
        setIsMembersLoading(false);
        return;
      }

      const cached = allProjectMembers.filter((m) => m.project_id === projectId);
      if (cached.length > 0) {
        setProjectMembers(cached);
        setSelectedAssignees((prev) => prev.filter((id) => cached.some((m) => m.user_id === id)));
        setIsMembersLoading(false);
        return;
      }

      setIsMembersLoading(true);
      try {
        const { data, error } = await supabase
          .from("project_members")
          .select("id, project_id, user_id, role, created_at")
          .eq("project_id", projectId);

        if (!mounted || !membersRequestTracker.current.isLatest(requestId)) return;
        if (error) throw error;

        const members = (data || []) as ProjectMemberRow[];
        setProjectMembers(members);
        setAllProjectMembers((prev) => {
          const without = prev.filter((item) => item.project_id !== projectId);
          return [...without, ...members];
        });
        setSelectedAssignees((prev) => prev.filter((id) => members.some((m) => m.user_id === id)));
      } catch (err) {
        if (!mounted || !membersRequestTracker.current.isLatest(requestId)) return;
        console.error("Load members error:", err);
      } finally {
        if (!mounted || !membersRequestTracker.current.isLatest(requestId)) return;
        setIsMembersLoading(false);
      }
    };

    void loadMembers();
    return () => { mounted = false; };
  }, [projectId, allProjectMembers]);

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return {
    // Form values
    title,
    setTitle,
    description,
    setDescription,
    projectId,
    setProjectId,
    priority,
    setPriority,
    status,
    setStatus,
    startDate,
    setStartDate,
    dueDate,
    setDueDate,
    selectedAssignees,
    setSelectedAssignees,
    toggleAssignee,
    
    // Data
    projects,
    projectMembers,
    profiles,
    currentUserId,
    currentUserRole,
    
    // States
    isBootstrapping,
    isMembersLoading,
    
    // Utils
    pageRequestTracker,
  };
}
