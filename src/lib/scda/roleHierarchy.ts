/**
 * Role Hierarchy Index
 * Defines role levels and inheritance structure
 */

import { UserRole, RoleHierarchy } from './types';

const ROLE_HIERARCHY_MAP: Record<UserRole, RoleHierarchy> = {
  super_super_admin: {
    role: 'super_super_admin',
    level: 4,
    permissions: [
      'access_all_data',
      'manage_all_users',
      'manage_all_industries',
      'view_all_logs',
      'revoke_access',
      'override_access_control',
      'manage_security_settings',
      'manage_scda_config',
      'audit_system',
    ],
    inherits: ['super_admin', 'admin', 'client'],
  },
  super_admin: {
    role: 'super_admin',
    level: 3,
    permissions: [
      'access_industry_data',
      'manage_industry_users',
      'manage_admins',
      'view_industry_logs',
      'revoke_industry_access',
      'share_industry_data',
      'manage_industry_security',
    ],
    inherits: ['admin', 'client'],
  },
  admin: {
    role: 'admin',
    level: 2,
    permissions: [
      'access_organization_data',
      'manage_organization_users',
      'share_organization_data',
      'view_organization_logs',
      'manage_client_access',
    ],
    inherits: ['client'],
  },
  client: {
    role: 'client',
    level: 1,
    permissions: [
      'access_shared_data',
      'view_own_data',
      'share_own_data',
      'view_own_logs',
    ],
    inherits: [],
  },
};

/**
 * Get role hierarchy information
 */
export function getRoleHierarchy(role: UserRole): RoleHierarchy {
  if (!role || !ROLE_HIERARCHY_MAP[role]) {
    // Log at debug level only - this is expected for some edge cases
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Undefined role detected, defaulting to 'client' hierarchy`);
    }
    return ROLE_HIERARCHY_MAP['client']; // Default to lowest privilege level
  }
  return ROLE_HIERARCHY_MAP[role];
}

/**
 * Get role level (higher number = higher privilege)
 */
export function getRoleLevel(role: UserRole): number {
  if (!role || !ROLE_HIERARCHY_MAP[role]) {
    // Log at debug level only - this is expected for some edge cases
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Undefined role detected, defaulting to 'client' level`);
    }
    return ROLE_HIERARCHY_MAP['client'].level; // Default to lowest privilege level
  }
  return ROLE_HIERARCHY_MAP[role].level;
}

/**
 * Check if one role can access data of another role
 */
export function canRoleAccessOtherRole(
  accesserRole: UserRole,
  ownerRole: UserRole
): boolean {
  const accesserLevel = getRoleLevel(accesserRole || 'client');
  const ownerLevel = getRoleLevel(ownerRole || 'client');

  // Higher level roles can access data of lower level roles
  return accesserLevel >= ownerLevel;
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: UserRole,
  permission: string
): boolean {
  const effectiveRole = role || 'client';
  const hierarchy = ROLE_HIERARCHY_MAP[effectiveRole];

  // Check direct permissions
  if (hierarchy.permissions.includes(permission)) {
    return true;
  }

  // Check inherited permissions from lower roles
  for (const inheritedRole of hierarchy.inherits) {
    const inheritedHierarchy = ROLE_HIERARCHY_MAP[inheritedRole];
    if (inheritedHierarchy.permissions.includes(permission)) {
      return true;
    }
  }

  return false;
}

/**
 * Get all permissions for a role (including inherited)
 */
export function getAllPermissions(role: UserRole): string[] {
  const effectiveRole = role || 'client';
  const hierarchy = ROLE_HIERARCHY_MAP[effectiveRole];
  const permissions = new Set<string>(hierarchy.permissions);

  // Add inherited permissions
  for (const inheritedRole of hierarchy.inherits) {
    const inheritedPermissions = getAllPermissions(inheritedRole);
    inheritedPermissions.forEach((p) => permissions.add(p));
  }

  return Array.from(permissions);
}

/**
 * Check if role can manage other users
 */
export function canManageUsers(role: UserRole, targetUserRole: UserRole): boolean {
  const myLevel = getRoleLevel(role || 'client');
  const targetLevel = getRoleLevel(targetUserRole || 'client');

  // Can manage users of same or lower level
  return myLevel > targetLevel;
}

/**
 * Get access control constraints for a role
 */
export function getRoleConstraints(role: UserRole): {
  canAccessAllData: boolean;
  requiresIndustryMatch: boolean;
  requiresOrganizationMatch: boolean;
  canAccessSharedOnly: boolean;
} {
  const effectiveRole = role || 'client';
  switch (effectiveRole) {
    case 'super_super_admin':
      return {
        canAccessAllData: true,
        requiresIndustryMatch: false,
        requiresOrganizationMatch: false,
        canAccessSharedOnly: false,
      };
    case 'super_admin':
      return {
        canAccessAllData: false,
        requiresIndustryMatch: true,
        requiresOrganizationMatch: false,
        canAccessSharedOnly: false,
      };
    case 'admin':
      return {
        canAccessAllData: false,
        requiresIndustryMatch: false,
        requiresOrganizationMatch: true,
        canAccessSharedOnly: false,
      };
    case 'client':
    default:
      return {
        canAccessAllData: false,
        requiresIndustryMatch: false,
        requiresOrganizationMatch: false,
        canAccessSharedOnly: true,
      };
  }
}
