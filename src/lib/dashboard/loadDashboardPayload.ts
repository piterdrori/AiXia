import { supabase } from "@/lib/supabase";
import {
  canViewCalendarEvent,
  canViewTask,
  getVisibleProjectIds,
  isAdminRole,
  normalizeRole,
  type Role,
} from "@/lib/permissions";
import { loadDashboardProjectsAndMembers } from "@/lib/dashboard/loadDashboardWorkspaceData";

export type DashboardCurrentUser = {
  id: string;
  full_name: string | null;
  role: Role | null;
  permissions: Record<string, boolean> | null;
};

export type DashboardPayload = {
  currentUser: DashboardCurrentUser;
  projects: unknown[];
  projectMembers: unknown[];
  taskMembers: unknown[];
  tasks: unknown[];
  activeMembersCount: number;
  calendarEvents: unknown[];
  activityLogs: unknown[];
};

type ProjectRow = {
  id: string;
  created_by: string | null;
};

type ProjectMemberRow = {
  project_id: string;
  user_id: string;
};

type TaskRow = {
  id: string;
  project_id: string | null;
  created_by: string | null;
  assignee_id: string | null;
};

type TaskMemberRow = {
  task_id: string;
  user_id: string;
};

type CalendarEventRow = {
  id: string;
  project_id: string | null;
  created_by: string | null;
};

function pickArray(raw: Record<string, unknown>, camel: string, snake: string): unknown[] {
  const value = raw[camel] ?? raw[snake];
  return Array.isArray(value) ? value : [];
}

function normalizePayload(raw: Record<string, unknown>): DashboardPayload {
  const currentUser = (raw.currentUser || raw.current_user || {}) as Record<string, unknown>;
  return {
    currentUser: {
      id: String(currentUser.id || currentUser.user_id || ""),
      full_name: (currentUser.full_name as string | null) ?? null,
      role: normalizeRole(currentUser.role as string | null | undefined),
      permissions:
        (currentUser.permissions as Record<string, boolean> | null) ?? null,
    },
    projects: pickArray(raw, "projects", "projects"),
    projectMembers: pickArray(raw, "projectMembers", "project_members"),
    taskMembers: pickArray(raw, "taskMembers", "task_members"),
    tasks: pickArray(raw, "tasks", "tasks"),
    activeMembersCount: Number(raw.activeMembersCount ?? raw.active_members_count) || 0,
    calendarEvents: pickArray(raw, "calendarEvents", "calendar_events"),
    activityLogs: pickArray(raw, "activityLogs", "activity_logs"),
  };
}

/** Prefer edge only when core entities (projects/tasks) are richer — not activity-only inflation. */
function coreDataScore(payload: DashboardPayload): number {
  return (
    payload.projects.length * 10_000 +
    payload.tasks.length * 100 +
    payload.projectMembers.length
  );
}

async function resolveAuthUserId(): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.warn("Dashboard auth getSession:", sessionError.message);
  }
  const sessionUser = sessionData.session?.user;
  if (sessionUser?.id) {
    return sessionUser.id;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    throw new Error("Not authenticated");
  }
  return user.id;
}

function mergePreferRicher(base: DashboardPayload, extra: DashboardPayload): DashboardPayload {
  const pick = <T>(a: T[], b: T[]) => (b.length > a.length ? b : a);
  return {
    currentUser: base.currentUser.id ? base.currentUser : extra.currentUser,
    projects: pick(base.projects, extra.projects),
    projectMembers: pick(base.projectMembers, extra.projectMembers),
    taskMembers: pick(base.taskMembers, extra.taskMembers),
    tasks: pick(base.tasks, extra.tasks),
    activeMembersCount: Math.max(base.activeMembersCount, extra.activeMembersCount),
    calendarEvents: pick(base.calendarEvents, extra.calendarEvents),
    activityLogs: pick(base.activityLogs, extra.activityLogs),
  };
}

/** Same data paths as Projects / Tasks pages — not dependent on edge function alone. */
async function loadDashboardPayloadDirect(): Promise<DashboardPayload> {
  const userId = await resolveAuthUserId();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, full_name, role, permissions")
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error(profileError?.message || "Failed to load profile");
  }

  const role = normalizeRole(profile.role as string | null | undefined);
  const isAdmin = isAdminRole(role);

  const workspace = await loadDashboardProjectsAndMembers();
  const projectsTyped = (workspace.projects.length > 0 ? workspace.projects : []) as ProjectRow[];
  const projectMembersTyped = (workspace.projectMembers.length > 0
    ? workspace.projectMembers
    : []) as ProjectMemberRow[];
  const visibleIds = getVisibleProjectIds(userId, role, projectsTyped, projectMembersTyped);

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
      .select(
        "id, title, event_type, start_date, project_id, task_id, created_by"
      )
      .order("start_date", { ascending: true }),
    supabase
      .from("activity_logs")
      .select(
        "id, project_id, task_id, user_id, action_type, entity_type, entity_id, message, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  [tasksError, taskMembersError, eventsError, logsError, countError]
    .filter(Boolean)
    .forEach((err) => console.warn("Dashboard direct load:", err));

  const taskMembers = (taskMembersRaw || []) as TaskMemberRow[];
  const tasksRawList = (tasksRaw || []) as TaskRow[];
  const calendarEventsRawList = (calendarEventsRaw || []) as CalendarEventRow[];

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

  const permissions =
    profile.permissions && typeof profile.permissions === "object"
      ? (profile.permissions as Record<string, boolean>)
      : null;

  return {
    currentUser: {
      id: userId,
      full_name: profile.full_name,
      role,
      permissions,
    },
    projects: projectsTyped,
    projectMembers: projectMembersTyped,
    taskMembers: taskMembersRaw || [],
    tasks,
    activeMembersCount: activeMembersCount || 0,
    calendarEvents,
    activityLogs: activityLogsRaw || [],
  };
}

export async function loadDashboardPayload(): Promise<DashboardPayload> {
  const direct = await loadDashboardPayloadDirect();

  try {
    const { data, error } = await supabase.functions.invoke("dashboard-summary");
    if (!error && data?.payload) {
      const edge = normalizePayload(data.payload as Record<string, unknown>);
      if (coreDataScore(edge) > coreDataScore(direct)) {
        return mergePreferRicher(direct, edge);
      }
    }
  } catch (err) {
    console.warn("dashboard-summary skipped:", err);
  }

  return direct;
}
