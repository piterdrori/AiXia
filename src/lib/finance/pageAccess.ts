import {
  ACCESS_APPROVAL_SECTIONS,
  getSectionLevelState,
  type AccessApprovalSectionKey,
} from "@/lib/accessFinancialApprovalPermissions";
import { type Permission, type Role } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

export type FinanceLoadMode = "initial" | "silent";

export type FinancePagePermissionState = {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDeleteArchive: boolean;
  canApproveExecute: boolean;
  isAdmin: boolean;
};

export type FinancePageAccessConfig = {
  sectionKey: AccessApprovalSectionKey;
  adminPermissions?: readonly Permission[];
  readPermissions?: readonly Permission[];
  createPermissions?: readonly Permission[];
  updatePermissions?: readonly Permission[];
  deleteArchivePermissions?: readonly Permission[];
  approveExecutePermissions?: readonly Permission[];
};

const EMPTY_FINANCE_PAGE_PERMISSION_STATE: FinancePagePermissionState = {
  canRead: false,
  canCreate: false,
  canUpdate: false,
  canDeleteArchive: false,
  canApproveExecute: false,
  isAdmin: false,
};

function hasPermission(
  permissions: Partial<Record<Permission, boolean>> | null | undefined,
  permission: Permission
) {
  return Boolean(permissions?.[permission]);
}

function hasAnyPermission(
  permissions: Partial<Record<Permission, boolean>> | null | undefined,
  permissionList: readonly Permission[] | undefined
) {
  if (!permissionList || permissionList.length === 0) return false;
  return permissionList.some((permission) => hasPermission(permissions, permission));
}

export function resolveFinancePagePermissionState({
  profileRole,
  permissions,
  config,
}: {
  profileRole: Role | null | undefined;
  permissions: Partial<Record<Permission, boolean>> | null | undefined;
  config: FinancePageAccessConfig;
}): FinancePagePermissionState {
  if (!profileRole || !permissions) {
    return EMPTY_FINANCE_PAGE_PERMISSION_STATE;
  }

  const isAdmin = String(profileRole || "").toLowerCase() === "admin";
  const section = ACCESS_APPROVAL_SECTIONS.find(
    (accessSection) => accessSection.key === config.sectionKey
  );

  const sectionState = section
    ? getSectionLevelState(section, permissions as Record<Permission, boolean>)
    : null;

  const hasAdminBypass = hasAnyPermission(permissions, config.adminPermissions);

  const rawApproveExecute =
    hasAdminBypass ||
    Boolean(sectionState?.approveExecute) ||
    hasAnyPermission(permissions, config.approveExecutePermissions);

  const rawDeleteArchive =
    hasAdminBypass ||
    Boolean(sectionState?.deleteArchive) ||
    hasAnyPermission(permissions, config.deleteArchivePermissions);

  const rawUpdate =
    hasAdminBypass ||
    Boolean(sectionState?.update) ||
    hasAnyPermission(permissions, config.updatePermissions);

  const rawCreate =
    hasAdminBypass ||
    Boolean(sectionState?.create) ||
    hasAnyPermission(permissions, config.createPermissions);

  const rawRead =
    hasAdminBypass ||
    Boolean(sectionState?.read) ||
    hasAnyPermission(permissions, config.readPermissions);

  const canApproveExecute = rawApproveExecute;
  const canDeleteArchive = rawDeleteArchive || canApproveExecute;
  const canUpdate = rawUpdate || canDeleteArchive;
  const canCreate = rawCreate || canUpdate;
  const canRead = rawRead || canCreate;

  return {
    isAdmin,
    canRead,
    canCreate,
    canUpdate,
    canDeleteArchive,
    canApproveExecute,
  };
}

export async function fetchFinanceEffectivePermissions(
  userId: string,
  mode: FinanceLoadMode,
  logLabel: string
): Promise<Partial<Record<Permission, boolean>> | null> {
  try {
    const result = await supabase.rpc("finance_get_effective_permissions", {
      target_user_id: userId,
    });

    if (result.error) {
      if (mode === "silent") {
        throw result.error;
      }

      console.warn(`${logLabel} permission RPC fallback:`, result.error.message);
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      if (mode === "silent") {
        throw new Error(
          `Silent ${logLabel} permission refresh returned no effective permission payload.`
        );
      }

      return null;
    }

    return result.data as Partial<Record<Permission, boolean>>;
  } catch (error) {
    if (mode === "silent") {
      throw error;
    }

    console.warn(`${logLabel} permission RPC failed:`, error);
    return null;
  }
}
