import { supabase } from "@/lib/supabase";
import {
  canViewCalendarEvent,
  canViewTask,
  getEffectivePermissions,
  getVisibleProjectIds,
  isAdminRole,
  normalizeRole,
  type Role,
} from "@/lib/permissions";

export type DashboardProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  progress: number | null;
  created_by: string | null;
  end_date?: string | null;
  created_at: string;
};

export type DashboardProjectMemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

const PROJECT_SELECT =
  "id, name, description, status, progress, created_by, end_date, created_at";

const MEMBER_SELECT = "id, project_id, user_id, role, created_at";

export type DashboardAccess = {
  userId: string;
  role: Role;
  isAdmin: boolean;
  fullName: string;
  permissions: Record<string, boolean> | null;
};

/** Profile + admin flag (same rules as Employees / Finance). */
export async function resolveDashboardAccess(): Promise<DashboardAccess | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, role, permissions")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.warn("Dashboard access profile:", error.message);
    return null;
  }

  const role = normalizeRole((profile as { role?: string | null }).role);
  const permissions =
    profile?.permissions && typeof profile.permissions === "object"
      ? (profile.permissions as Record<string, boolean>)
      : null;
  const effective = getEffectivePermissions(role, permissions);

  return {
    userId: user.id,
    role,
    isAdmin: isAdminRole(role) || Boolean(effective.manageUsers),
    fullName: (profile as { full_name?: string | null }).full_name?.trim() || "User",
    permissions,
  };
}

/** Same Supabase paths as Projects page — used by dashboard payload and cards. */
export async function loadDashboardProjectsAndMembers(options?: {
  userId?: string;
  role?: Role;
}): Promise<{
  projects: DashboardProjectRow[];
  projectMembers: DashboardProjectMemberRow[];
  role: Role | null;
  userId: string | null;
}> {
  let userId = options?.userId ?? null;
  let role = options?.role ?? null;

  if (!userId || !role) {
    const access = await resolveDashboardAccess();
    if (!access) {
      return { projects: [], projectMembers: [], role: null, userId: null };
    }
    userId = access.userId;
    role = access.role;
  }

  if (isAdminRole(role)) {
    const [{ data: projectsData, error: projectsError }, { data: membersData, error: membersError }] =
      await Promise.all([
        supabase.from("projects").select(PROJECT_SELECT).order("created_at", { ascending: false }),
        supabase.from("project_members").select(MEMBER_SELECT),
      ]);

    if (projectsError) console.warn("Dashboard projects:", projectsError.message);
    if (membersError) console.warn("Dashboard project_members:", membersError.message);

    return {
      projects: (projectsData || []) as DashboardProjectRow[],
      projectMembers: (membersData || []) as DashboardProjectMemberRow[],
      role,
      userId,
    };
  }

  const { data: memberRows, error: membersError } = await supabase
    .from("project_members")
    .select("project_id, user_id")
    .eq("user_id", userId);

  if (membersError) {
    console.warn("Dashboard project memberships:", membersError.message);
    return { projects: [], projectMembers: [], role, userId };
  }

  const visibleProjectIds = Array.from(
    new Set(
      ((memberRows as { project_id: string }[] | null) || []).map((row) => row.project_id)
    )
  );

  const projectsQuery =
    visibleProjectIds.length > 0
      ? supabase
          .from("projects")
          .select(PROJECT_SELECT)
          .or(`created_by.eq.${userId},id.in.(${visibleProjectIds.join(",")})`)
      : supabase.from("projects").select(PROJECT_SELECT).eq("created_by", userId);

  const { data: projectsData, error: projectsError } = await projectsQuery.order("created_at", {
    ascending: false,
  });

  if (projectsError) {
    console.warn("Dashboard projects:", projectsError.message);
    return { projects: [], projectMembers: [], role, userId };
  }

  const projects = (projectsData || []) as DashboardProjectRow[];
  const projectIds = projects.map((p) => p.id);

  if (projectIds.length === 0) {
    return { projects, projectMembers: [], role, userId };
  }

  const { data: membersData, error: projectMembersError } = await supabase
    .from("project_members")
    .select(MEMBER_SELECT)
    .in("project_id", projectIds);

  if (projectMembersError) {
    console.warn("Dashboard project_members:", projectMembersError.message);
  }

  return {
    projects,
    projectMembers: (membersData || []) as DashboardProjectMemberRow[],
    role,
    userId,
  };
}

export type DashboardTaskRow = {
  id: string;
  title: string;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  assignee_id: string | null;
  project_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type DashboardTaskMemberRow = {
  id: string;
  task_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export type DashboardCalendarEventRow = {
  id: string;
  title: string;
  event_type: string | null;
  start_date: string;
  project_id: string | null;
  task_id: string | null;
  created_by: string | null;
};

export type DashboardActivityLogRow = {
  id: string;
  project_id: string | null;
  task_id: string | null;
  user_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  message: string;
  created_at: string;
};

export type FullDashboardData = {
  userId: string;
  fullName: string;
  role: Role;
  permissions: Record<string, boolean> | null;
  projects: DashboardProjectRow[];
  projectMembers: DashboardProjectMemberRow[];
  taskMembers: DashboardTaskMemberRow[];
  tasks: DashboardTaskRow[];
  calendarEvents: DashboardCalendarEventRow[];
  activityLogs: DashboardActivityLogRow[];
  activeMembersCount: number;
};

async function waitForSessionUserId(maxAttempts = 8): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { data: sessionData } = await supabase.auth.getSession();
    const id = sessionData.session?.user?.id;
    if (id) return id;

    await new Promise((resolve) => {
      setTimeout(resolve, 75 * (attempt + 1));
    });
  }
  return null;
}

/** One-shot loader for dashboard metrics + cards (Projects / Tasks / Calendar paths). */
export async function loadFullDashboardData(): Promise<FullDashboardData | null> {
  const userId = await waitForSessionUserId();
  if (!userId) return null;

  const access = await resolveDashboardAccess();
  if (!access) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role, permissions")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      console.warn("Dashboard profile:", profileError?.message);
      return null;
    }

    const role = normalizeRole((profile as { role?: string | null }).role);
    const permissions =
      profile.permissions && typeof profile.permissions === "object"
        ? (profile.permissions as Record<string, boolean>)
        : null;

    return loadFullDashboardDataForUser({
      userId,
      fullName: (profile as { full_name?: string | null }).full_name?.trim() || "User",
      role,
      permissions,
    });
  }

  return loadFullDashboardDataForUser({
    userId: access.userId,
    fullName: access.fullName,
    role: access.role,
    permissions: access.permissions,
  });
}

async function loadFullDashboardDataForUser(input: {
  userId: string;
  fullName: string;
  role: Role;
  permissions: Record<string, boolean> | null;
}): Promise<FullDashboardData> {
  const { userId, fullName, role, permissions } = input;
  const isAdmin = isAdminRole(role);

  const workspace = await loadDashboardProjectsAndMembers({ userId, role });
  const projects = workspace.projects;
  const projectMembers = workspace.projectMembers;
  const visibleIds = getVisibleProjectIds(
    userId,
    role,
    projects,
    projectMembers
  );

  const [
    { data: tasksRaw, error: tasksError },
    { data: taskMembersRaw, error: taskMembersError },
    { data: calendarEventsRaw, error: eventsError },
    { data: activityLogsRaw, error: logsError },
    { count: activeMembersCount, error: countError },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, status, priority, due_date, assignee_id, project_id, created_by, created_at"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("task_members").select("id, task_id, user_id, role, created_at"),
    supabase
      .from("calendar_events")
      .select("id, title, event_type, start_date, project_id, task_id, created_by")
      .order("start_date", { ascending: true }),
    supabase
      .from("activity_logs")
      .select(
        "id, project_id, task_id, user_id, action_type, entity_type, entity_id, message, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  [tasksError, taskMembersError, eventsError, logsError, countError]
    .filter(Boolean)
    .forEach((err) => console.warn("Dashboard metrics load:", err));

  const taskMembers = (taskMembersRaw || []) as DashboardTaskMemberRow[];
  const tasksRawList = (tasksRaw || []) as DashboardTaskRow[];
  const calendarEventsRawList = (calendarEventsRaw || []) as DashboardCalendarEventRow[];

  const tasks = isAdmin
    ? tasksRawList
    : tasksRawList.filter((task) =>
        canViewTask(task, userId, role, taskMembers, visibleIds)
      );
  const calendarEvents = isAdmin
    ? calendarEventsRawList
    : calendarEventsRawList.filter((event) =>
        canViewCalendarEvent(event, userId, role, visibleIds)
      );

  return {
    userId,
    fullName,
    role,
    permissions,
    projects,
    projectMembers,
    taskMembers,
    tasks,
    calendarEvents,
    activityLogs: (activityLogsRaw || []) as DashboardActivityLogRow[],
    activeMembersCount: activeMembersCount || 0,
  };
}
