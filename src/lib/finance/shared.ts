import type { Role } from "@/lib/permissions";
import { canPerform } from "@/lib/permissions";

/**
 * Finance access guard
 */
export function assertFinanceAccess(
  role: Role,
  permissions?: Record<string, boolean> | null
) {
  const hasAccess = canPerform(role, "accessFinance", permissions);
  if (!hasAccess) {
    throw new Error("Unauthorized: Finance access denied");
  }
}

/**
 * Normalize finance status safely
 */
export function normalizeFinanceStatus(status: string | null | undefined) {
  if (!status) return "active";

  const allowed = ["active", "inactive", "archived"];
  return allowed.includes(status) ? status : "active";
}

/**
 * Default sorting for finance lists
 */
export const FINANCE_DEFAULT_ORDER = {
  column: "created_at",
  ascending: false,
};
