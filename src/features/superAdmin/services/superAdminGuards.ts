import type { AppRole } from "../types";

export function isSuperAdminRole(role?: AppRole | string | null): boolean {
  return role === "super_admin" || role === "superadmin";
}
