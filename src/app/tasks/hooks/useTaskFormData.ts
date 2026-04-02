import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { canPerform } from "@/lib/permissions";

import type {
  Role,
  ProjectRow,
  ProjectMemberRow,
  ProfileRow,
  TaskPriority,
  TaskStatus,
} from "../lib/task.types";

import {
  DEFAULT_TASK_STATUS,
  DEFAULT_TASK_PRIORITY,
} from "../lib/task.types";

interface FormState {
  title: string;
  description: string;
  projectId: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  selectedAssignees: string[];
}

interface DataState {
  projects: ProjectRow[];
  projectMembers: ProjectMemberRow[];
  profiles: ProfileRow[];
  allProjectMembers: ProjectMemberRow[];
}

interface MetaState {
  currentUserId: string | null;
  currentUserRole: Role | null;
  isBootstrapping: boolean;
  isMembersLoading: boolean;
}

const INITIAL_FORM: FormState = {
  title: "",
  description: "",
  projectId: "",
  priority: DEFAULT_TASK_PRIORITY,
  status: DEFAULT_TASK_STATUS,
  startDate: "",
  dueDate: "",
  selectedAssignees: [],
};

const INITIAL_DATA: DataState = {
  projects: [],
  projectMembers: [],
  profiles: [],
  allProjectMembers: [],
};

const INITIAL_META: MetaState = {
  currentUserId: null,
  currentUserRole: null,
  isBootstrapping: true,
  isMembersLoading: false,
};

export function useTaskFormData() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const pageTracker = useRef(createRequestTracker());
  const membersTracker = useRef(createRequestTracker());

  const initialProjectId = searchParams.get("projectId") || "";

  const [form, setForm] = useState<FormState>({
    ...INITIAL_FORM,
    projectId: initialProjectId,
  });

  const [data, setData] = useState<DataState>(INITIAL_DATA);
  const [meta, setMeta] = useState<MetaState>(INITIAL_META);

  // =========================
  // LOAD PAGE
  // =========================

  const loadPage = useCallback(async () => {
    const requestId = pageTracker.current.next();

    setMeta((prev) => ({ ...prev, isBootstrapping: true }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!pageTracker.current.isLatest(requestId)) return;

      if (!user) {
        navigate("/login");
        return;
      }

      const [
        { data: myProfile, error: myProfileError },
        { data: projectsData, error: projectsError },
        { data: projectMembersData, error: projectMembersError },
        { data: profilesData, error: profilesError },
      ] = await Promise.all([
        supabase.from("profiles").select("role").eq("user_id", user.id).single(),
        supabase.from("projects").select("id, name, created_by").order("created_at", { ascending: false }),
        supabase.from("project_members").select("id, project_id, user_id, role, created_at"),
        supabase.from("profiles").select("user_id, full_name, role, status").eq("status", "active"),
      ]);

      if (!pageTracker.current.isLatest(requestId)) return;

      if (
        myProfileError ||
        !myProfile ||
        projectsError ||
        projectMembersError ||
        profilesError
      ) {
        throw new Error("Failed loading task form data");
      }

      const role = myProfile.role as Role;

      if (!canPerform(role, "createTasks")) {
        navigate("/tasks");
        return;
      }

      const safeProjects = (projectsData || []) as ProjectRow[];
      const safeMembers = (projectMembersData || []) as ProjectMemberRow[];
      const safeProfiles = (profilesData || []) as ProfileRow[];

      const visibleProjects =
        role === "admin"
          ? safeProjects
          : safeProjects.filter((project) => {
              const isCreator = project.created_by === user.id;
              const isMember = safeMembers.some(
                (m) => m.project_id === project.id && m.user_id === user.id
              );
              return isCreator || isMember;
            });

      const safeProjectId =
        form.projectId &&
        visibleProjects.some((p) => p.id === form.projectId)
          ? form.projectId
          : "";

      const initialMembers = safeMembers.filter(
        (m) => m.project_id === safeProjectId
      );

      setData({
        projects: visibleProjects,
        projectMembers: initialMembers,
        profiles: safeProfiles,
        allProjectMembers: safeMembers,
      });

      setForm((prev) => ({
        ...prev,
        projectId: safeProjectId,
      }));

      setMeta({
        currentUserId: user.id,
        currentUserRole: role,
        isBootstrapping: false,
        isMembersLoading: false,
      });
    } catch (err) {
      if (!pageTracker.current.isLatest(requestId)) return;
      console.error("useTaskFormData error:", err);
      setMeta((prev) => ({ ...prev, isBootstrapping: false }));
    }
  }, [navigate, form.projectId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  // =========================
  // LOAD MEMBERS
  // =========================

  useEffect(() => {
    let mounted = true;

    const loadMembers = async () => {
      const requestId = membersTracker.current.next();

      if (!form.projectId) {
        setData((prev) => ({ ...prev, projectMembers: [] }));
        setForm((prev) => ({ ...prev, selectedAssignees: [] }));
        setMeta((prev) => ({ ...prev, isMembersLoading: false }));
        return;
      }

      const cached = data.allProjectMembers.filter(
        (m) => m.project_id === form.projectId
      );

      if (cached.length > 0) {
        setData((prev) => ({ ...prev, projectMembers: cached }));
        setForm((prev) => ({
          ...prev,
          selectedAssignees: prev.selectedAssignees.filter((id) =>
            cached.some((m) => m.user_id === id)
          ),
        }));
        return;
      }

      setMeta((prev) => ({ ...prev, isMembersLoading: true }));

      try {
        const { data: fetched, error } = await supabase
          .from("project_members")
          .select("id, project_id, user_id, role, created_at")
          .eq("project_id", form.projectId);

        if (!mounted || !membersTracker.current.isLatest(requestId)) return;

        if (error) throw error;

        const members = (fetched || []) as ProjectMemberRow[];

        setData((prev) => ({
          ...prev,
          projectMembers: members,
          allProjectMembers: [
            ...prev.allProjectMembers.filter(
              (m) => m.project_id !== form.projectId
            ),
            ...members,
          ],
        }));

        setForm((prev) => ({
          ...prev,
          selectedAssignees: prev.selectedAssignees.filter((id) =>
            members.some((m) => m.user_id === id)
          ),
        }));
      } catch (err) {
        if (!mounted || !membersTracker.current.isLatest(requestId)) return;
        console.error("Load members error:", err);
      } finally {
        if (!mounted || !membersTracker.current.isLatest(requestId)) return;
        setMeta((prev) => ({ ...prev, isMembersLoading: false }));
      }
    };

    void loadMembers();

    return () => {
      mounted = false;
    };
  }, [form.projectId, data.allProjectMembers]);

  // =========================
  // ACTIONS
  // =========================

  const toggleAssignee = useCallback((userId: string) => {
    setForm((prev) => ({
      ...prev,
      selectedAssignees: prev.selectedAssignees.includes(userId)
        ? prev.selectedAssignees.filter((id) => id !== userId)
        : [...prev.selectedAssignees, userId],
    }));
  }, []);

  // =========================
  // RETURN
  // =========================

  return {
    // form
    ...form,
    setForm,

    // granular setters (UI-friendly)
    setTitle: (v: string) => setForm((p) => ({ ...p, title: v })),
    setDescription: (v: string) => setForm((p) => ({ ...p, description: v })),
    setProjectId: (v: string) => setForm((p) => ({ ...p, projectId: v })),
    setPriority: (v: TaskPriority) => setForm((p) => ({ ...p, priority: v })),
    setStatus: (v: TaskStatus) => setForm((p) => ({ ...p, status: v })),
    setStartDate: (v: string) => setForm((p) => ({ ...p, startDate: v })),
    setDueDate: (v: string) => setForm((p) => ({ ...p, dueDate: v })),
    setSelectedAssignees: (v: string[]) =>
      setForm((p) => ({ ...p, selectedAssignees: v })),
    toggleAssignee,

    // data
    ...data,

    // meta
    ...meta,

    // infra
    pageTracker,
  };
}
