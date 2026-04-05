export type Role = "admin" | "manager" | "employee" | "guest";

export type Permission =
  | "createProjects"
  | "editAllProjects"
  | "deleteProjects"
  | "createTasks"
  | "editTasks"
  | "deleteTasks"

  | "viewEmployeeDirectory"
  | "viewEmployeeDetail"
  | "manageUsers"

  | "viewReports"
  | "generateProjectReports"
  | "accessChat"
  | "changeSettings"
  | "visibility"

  | "accessFinance"
  | "manageFinanceMasterData"
  | "viewFinance"
  | "createFinanceRecords"
  | "editFinanceRecords"
  | "archiveFinanceRecords"
  | "approveFinanceRecords";

type PermissionMap = Record<Permission, boolean>;

export type ProjectRow = {
  id: string;
  created_by: string | null;
};

export type TaskRow = {
  id: string;
  created_by: string | null;
  assignee_id?: string | null;
  project_id?: string | null;
};

export type ProjectMemberRow = {
  project_id: string;
  user_id: string;
};

export type TaskMemberRow = {
  task_id: string;
  user_id: string;
};

export type CalendarEventRow = {
  project_id: string | null;
  created_by: string | null;
};

const ROLE_PERMISSIONS: Record<Role, PermissionMap> = {
  admin: {
    createProjects: true,
    editAllProjects: true,
    deleteProjects: true,
    createTasks: true,
    editTasks: true,
    deleteTasks: true,

    viewEmployeeDirectory: true,
    viewEmployeeDetail: true,
    manageUsers: true,

    viewReports: true,
    generateProjectReports: true,
    accessChat: true,
    changeSettings: true,
    visibility: true,

    accessFinance: true,
    manageFinanceMasterData: true,
    viewFinance: true,
    createFinanceRecords: true,
    approveFinanceRecords: true,
    editFinanceRecords: true,
    archiveFinanceRecords: true,
  },

  manager: {
    createProjects: true,
    editAllProjects: true,
    deleteProjects: false,
    createTasks: true,
    editTasks: true,
    deleteTasks: false,

    viewEmployeeDirectory: true,
    viewEmployeeDetail: true,
    manageUsers: false,

    viewReports: true,
    generateProjectReports: false,
    accessChat: true,
    changeSettings: true,
    visibility: true,

    accessFinance: false,
    manageFinanceMasterData: false,
    viewFinance: false,
    createFinanceRecords: false,
    editFinanceRecords: false,
    archiveFinanceRecords: false,
    approveFinanceRecords: false,
  },

  employee: {
    createProjects: false,
    editAllProjects: false,
    deleteProjects: false,
    createTasks: true,
    editTasks: true,
    deleteTasks: false,

    viewEmployeeDirectory: true,
    viewEmployeeDetail: false,
    manageUsers: false,

    viewReports: false,
    generateProjectReports: false,
    accessChat: true,
    changeSettings: true,
    visibility: false,

    accessFinance: false,
manageFinanceMasterData: false,
viewFinance: false,
createFinanceRecords: false,
editFinanceRecords: false,
archiveFinanceRecords: false,
approveFinanceRecords: false,
  },

  guest: {
    createProjects: false,
    editAllProjects: false,
    deleteProjects: false,
    createTasks: true,
    editTasks: false,
    deleteTasks: false,

    viewEmployeeDirectory: true,
    viewEmployeeDetail: false,
    manageUsers: false,

    viewReports: false,
    generateProjectReports: false,
    accessChat: true,
    changeSettings: false,
    visibility: false,

    accessFinance: false,
    manageFinanceMasterData: false,
    viewFinance: false,
    createFinanceRecords: false,
    editFinanceRecords: false,
    archiveFinanceRecords: false,
    approveFinanceRecords: false,
  },
};

/* =========================================================
   ROUTE PERMISSIONS (CENTRALIZED)
========================================================= */

type RoutePermission = {
  roles?: Role[];
  permission?: Permission;
};

const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  "/dashboard": { roles: ["admin", "manager", "employee", "guest"] },

  "/projects": { roles: ["admin", "manager", "employee", "guest"] },
  "/projects/new": { permission: "createProjects" },
  "/projects/:id": { roles: ["admin", "manager", "employee", "guest"] },
  "/projects/:id/edit": { permission: "editAllProjects" },

  "/tasks": { roles: ["admin", "manager", "employee", "guest"] },
  "/tasks/new": { permission: "createTasks" },
  "/tasks/:id": { roles: ["admin", "manager", "employee", "guest"] },
  "/tasks/:id/edit": { permission: "editTasks" },

  "/calendar": { roles: ["admin", "manager", "employee", "guest"] },
  "/calendar/new": { permission: "createTasks" },
  "/calendar/day/:date": { roles: ["admin", "manager", "employee", "guest"] },
  "/calendar/:id/edit": { permission: "editTasks" },

  "/chat": { permission: "accessChat" },
  "/chat/:id": { permission: "accessChat" },
  "/inbox": { permission: "accessChat" },

  "/employees": { permission: "viewEmployeeDirectory" },
  "/employees/:id": { permission: "viewEmployeeDetail" },
  "/employees/:id/permissions": { permission: "manageUsers" },

  "/finance": { permission: "accessFinance" },
  "/finance/clients": { permission: "viewFinance" },
  "/finance/vendors": { permission: "viewFinance" },
  "/finance/bank-accounts": { permission: "viewFinance" },
  "/finance/payment-methods": { permission: "viewFinance" },
  "/finance/expense-categories": { permission: "viewFinance" },
  "/finance/revenue-categories": { permission: "viewFinance" },
  "/finance/settings": { permission: "manageFinanceMasterData" },

  "/settings": { permission: "changeSettings" },
};

export function getEffectivePermissions(
  role: Role,
  overrides?: Partial<PermissionMap> | null
): PermissionMap {
  const effective: PermissionMap = {
    ...ROLE_PERMISSIONS[role],
    ...(overrides ?? {}),
  };

  if (effective.manageUsers) {
    effective.viewEmployeeDirectory = true;
    effective.viewEmployeeDetail = true;
  }

  return effective;
}

export function canPerform(
  role: Role,
  permission: Permission,
  overrides?: Partial<PermissionMap> | null
): boolean {
  const perms = getEffectivePermissions(role, overrides);
  return !!perms[permission];
}

export function canAccessRoute(
  role: Role,
  route: string,
  overrides?: Partial<PermissionMap> | null
): boolean {
  const sortedRoutes = Object.entries(ROUTE_PERMISSIONS).sort(
    ([a], [b]) => b.length - a.length
  );

  const entry = sortedRoutes.find(([pattern]) => {
    if (pattern.includes(":")) {
      const patternParts = pattern.split("/");
      const routeParts = route.split("/");

      if (patternParts.length !== routeParts.length) return false;

      return patternParts.every((part, index) => {
        return part.startsWith(":") || part === routeParts[index];
      });
    }

    return route === pattern;
  });

  if (!entry) return true;

  const [, config] = entry;

  if (config.roles) {
    return config.roles.includes(role);
  }

  if (config.permission) {
    return canPerform(role, config.permission, overrides);
  }

  return true;
}

/* =========================================================
   PROJECT PERMISSIONS
========================================================= */

export function canViewProject(
  project: ProjectRow,
  userId: string | null,
  role: Role,
  projectMembers: ProjectMemberRow[]
): boolean {
  if (!userId) return false;
  if (role === "admin") return true;

  const isCreator = project.created_by === userId;

  const isMember = projectMembers.some(
    (m) => m.project_id === project.id && m.user_id === userId
  );

  return isCreator || isMember;
}

export function canEditProject(
  project: ProjectRow,
  userId: string | null,
  role: Role
): boolean {
  if (!userId) return false;
  return role === "admin" || project.created_by === userId;
}

export function canDeleteProject(
  project: ProjectRow,
  userId: string | null,
  role: Role
): boolean {
  if (!userId) return false;
  return role === "admin" || project.created_by === userId;
}

/* =========================================================
   TASK PERMISSIONS
========================================================= */

export function canViewTask(
  task: TaskRow,
  userId: string | null,
  role: Role,
  taskMembers: TaskMemberRow[],
  visibleProjectIds: Set<string>
): boolean {
  if (!userId) return false;
  if (role === "admin") return true;

  const isCreator = task.created_by === userId;
  const isAssignee = task.assignee_id === userId;

  const isTaskMember = taskMembers.some(
    (m) => m.task_id === task.id && m.user_id === userId
  );

  const isProjectVisible =
    !!task.project_id && visibleProjectIds.has(task.project_id);

  return isCreator || isAssignee || isTaskMember || isProjectVisible;
}

export function canEditTaskEntity(
  task: TaskRow,
  userId: string | null,
  role: Role
): boolean {
  if (!userId) return false;
  return role === "admin" || task.created_by === userId;
}

export function canDeleteTaskEntity(
  task: TaskRow,
  userId: string | null,
  role: Role
): boolean {
  if (!userId) return false;
  return role === "admin" || task.created_by === userId;
}

export function canMoveTask(
  task: TaskRow,
  userId: string | null,
  role: Role,
  taskMembers: TaskMemberRow[],
  visibleProjectIds?: Set<string>
): boolean {
  if (!userId) return false;

  const isCreator = task.created_by === userId;
  const isAssignee = task.assignee_id === userId;

  const isTaskMember = taskMembers.some(
    (m) => m.task_id === task.id && m.user_id === userId
  );

  const isProjectVisible =
    !!task.project_id && !!visibleProjectIds?.has(task.project_id);

  return (
    role === "admin" ||
    role === "manager" ||
    isCreator ||
    isAssignee ||
    isTaskMember ||
    isProjectVisible
  );
}

export function canCreateTask(role: Role): boolean {
  return canPerform(role, "createTasks");
}

/* =========================================================
   CALENDAR PERMISSIONS
========================================================= */

export function getVisibleProjectIds(
  userId: string,
  role: Role,
  projects: ProjectRow[],
  projectMembers: ProjectMemberRow[]
): Set<string> {
  if (role === "admin") {
    return new Set(projects.map((p) => p.id));
  }

  return new Set([
    ...projects.filter((p) => p.created_by === userId).map((p) => p.id),
    ...projectMembers
      .filter((m) => m.user_id === userId)
      .map((m) => m.project_id),
  ]);
}

export function canViewCalendarEvent(
  event: CalendarEventRow,
  userId: string,
  role: Role,
  visibleProjectIds: Set<string>
): boolean {
  if (role === "admin") return true;

  if (!event.project_id) {
    return event.created_by === userId;
  }

  return visibleProjectIds.has(event.project_id);
}
