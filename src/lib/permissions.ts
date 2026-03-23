export type Role = "admin" | "manager" | "employee" | "guest";

export type Permission =
  | "createProjects"
  | "editAllProjects"
  | "deleteProjects"
  | "createTasks"
  | "editTasks"
  | "deleteTasks"
  | "manageUsers"
  | "viewReports"
  | "accessChat"
  | "changeSettings"
  | "visibility";

type PermissionMap = Record<Permission, boolean>;

const ROLE_PERMISSIONS: Record<Role, PermissionMap> = {
  admin: {
    createProjects: true,
    editAllProjects: true,
    deleteProjects: true,
    createTasks: true,
    editTasks: true,
    deleteTasks: true,
    manageUsers: true,
    viewReports: true,
    accessChat: true,
    changeSettings: true,
    visibility: true,
  },

  manager: {
    createProjects: true,
    editAllProjects: true,
    deleteProjects: false,
    createTasks: true,
    editTasks: true,
    deleteTasks: false,
    manageUsers: false,
    viewReports: true,
    accessChat: true,
    changeSettings: true,
    visibility: true,
  },

  employee: {
    createProjects: false,
    editAllProjects: false,
    deleteProjects: false,
    createTasks: true,
    editTasks: true,
    deleteTasks: false,
    manageUsers: false,
    viewReports: false,
    accessChat: true,
    changeSettings: true,
    visibility: false,
  },

  guest: {
    createProjects: false,
    editAllProjects: false,
    deleteProjects: false,
    createTasks: true,
    editTasks: false,
    deleteTasks: false,
    manageUsers: false,
    viewReports: false,
    accessChat: true,
    changeSettings: false,
    visibility: false,
  },
};

export function getEffectivePermissions(
  role: Role,
  overrides?: Partial<PermissionMap> | null
): PermissionMap {
  const base = ROLE_PERMISSIONS[role];

  if (!overrides) return base;

  return {
    ...base,
    ...overrides,
  };
}

export function canPerform(
  role: Role,
  permission: Permission,
  overrides?: Partial<PermissionMap> | null
): boolean {
  const perms = getEffectivePermissions(role, overrides);
  return !!perms[permission];
}

export function canAccessRoute(role: Role, route: string): boolean {
  // simple route rules (can expand later)

  if (route.startsWith("/employees")) {
    return role === "admin";
  }

  if (route.startsWith("/settings")) {
    return role !== "guest";
  }

  return true;
}
